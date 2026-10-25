import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DIR = path.resolve(DB_DIR, 'backups');
const DB_PATH = process.env.DATABASE_PATH || path.resolve(DB_DIR, 'pulsefeedback.db');

// Ensure storage directories exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

let dbInstance: any = null;

function saveDb(): void {
  if (!dbInstance) return;
  const data = dbInstance.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export async function getDb(): Promise<any> {
  if (!dbInstance) {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } else {
      dbInstance = new SQL.Database();
      saveDb();
    }
  }
  return dbInstance;
}

// Promise-based wrappers for parameterized queries
export async function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  const db = await getDb();
  db.run(sql, params);
  saveDb();

  try {
    const res = db.exec('SELECT last_insert_rowid() as id, changes() as changes');
    const lastID = res[0]?.values[0]?.[0] || 0;
    const changes = res[0]?.values[0]?.[1] || 0;
    return { lastID, changes };
  } catch {
    return { lastID: 0, changes: 0 };
  }
}

export async function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result: T | undefined = undefined;
  if (stmt.step()) {
    result = stmt.getAsObject() as T;
  }
  stmt.free();
  return result;
}

export async function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export async function dbExec(sql: string): Promise<void> {
  const db = await getDb();
  db.run(sql);
  saveDb();
}

// Initialize tables and seed admin
export async function initializeDatabase(): Promise<void> {
  await getDb();

  // Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Surveys table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      welcome_message TEXT DEFAULT '',
      anonymous_responses INTEGER DEFAULT 1,
      show_progress_bar INTEGER DEFAULT 1,
      randomize_order INTEGER DEFAULT 0,
      one_response_per_user INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Questions table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      required INTEGER DEFAULT 1,
      options_json TEXT DEFAULT '[]',
      config_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);

  // Responses table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      respondent_id TEXT,
      submitted_at TEXT NOT NULL,
      ip_hash TEXT
    );
  `);

  // Answers table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer_value TEXT NOT NULL
    );
  `);

  // Audit Logs table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default administrator if not present
  const adminEmail = (process.env.ADMIN_EMAIL || 'plus10@gmail.com').toLowerCase();
  const initialAdminPass = process.env.ADMIN_INITIAL_PASSWORD || 'creativity';

  const existingAdmin = await dbGet('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (!existingAdmin) {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(initialAdminPass, saltRounds);
    const adminId = 'admin_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, must_change_password, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, 'System Administrator', adminEmail, passwordHash, 'admin', 1, now]
    );

    await logAuditEvent(adminId, 'ADMIN_SEEDED', `Administrator account initialized (${adminEmail}). Mandatory password change flagged.`, '127.0.0.1');
    console.log(`[DB] Seeded administrator account for ${adminEmail} (password change enforced on first login).`);
  }
}

// Log audit events securely
export async function logAuditEvent(
  userId: string | null,
  eventType: string,
  description: string,
  ipAddress?: string
): Promise<void> {
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  try {
    await dbRun(
      `INSERT INTO audit_logs (id, user_id, event_type, description, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [logId, userId, eventType, description, ipAddress || 'unknown', now]
    );
  } catch (err) {
    console.error('[DB] Failed to record audit log:', err);
  }
}

// Backup database file and clear responses/answers without deleting users or surveys
export async function backupAndResetResponses(adminUserId: string, clientIp: string): Promise<{
  backupFile: string;
  deletedResponsesCount: number;
  deletedAnswersCount: number;
}> {
  // Count records to delete
  const respCountRow = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM responses');
  const ansCountRow = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM answers');
  const deletedResponsesCount = respCountRow?.count || 0;
  const deletedAnswersCount = ansCountRow?.count || 0;

  // Create timestamped backup file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup_before_reset_${timestamp}.db`;
  const backupFilePath = path.resolve(BACKUP_DIR, backupFileName);

  // Safely copy current DB file as backup
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, backupFilePath);
  }

  // Delete only responses and answers
  await dbRun('DELETE FROM answers;');
  await dbRun('DELETE FROM responses;');

  // Record audit log
  await logAuditEvent(
    adminUserId,
    'SURVEY_DATA_RESET',
    `Admin reset survey responses. Created backup ${backupFileName}. Deleted ${deletedResponsesCount} responses and ${deletedAnswersCount} answers. Users and survey structures preserved.`,
    clientIp
  );

  return {
    backupFile: backupFileName,
    deletedResponsesCount,
    deletedAnswersCount,
  };
}
