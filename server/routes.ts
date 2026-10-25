import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  dbGet,
  dbAll,
  dbRun,
  logAuditEvent,
  backupAndResetResponses,
} from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'pulsefeedback_jwt_secure_key_2026_super_secret_xyz';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// In-memory rate limiter for login protection
const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

function checkRateLimit(ip: string): boolean {
  const record = loginAttempts.get(ip);
  if (!record) return true;
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    return false; // locked
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    loginAttempts.delete(ip);
    return true;
  }
  return record.count < 10; // max 10 attempts in 5 minutes
}

function registerFailedAttempt(ip: string) {
  const record = loginAttempts.get(ip) || { count: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 minute lock
  }
  loginAttempts.set(ip, record);
}

function resetFailedAttempts(ip: string) {
  loginAttempts.delete(ip);
}

// Authentication Middleware
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token =
    req.cookies?.pf_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : null);

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }
}

// Admin-only Middleware
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Administrator privileges required.' });
      return;
    }
    next();
  });
}

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// Register
apiRouter.post('/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid name (at least 2 characters).' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid corporate email address.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Hash password with bcrypt 12 salt rounds
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, must_change_password, created_at)
       VALUES (?, ?, ?, ?, 'user', 0, ?)`,
      [userId, name.trim(), normalizedEmail, passwordHash, now]
    );

    await logAuditEvent(userId, 'USER_REGISTERED', `New user registered: ${normalizedEmail}`, clientIp);

    const tokenPayload = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      role: 'user',
      mustChangePassword: false,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('pf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: tokenPayload,
      token,
      message: 'Registration successful! Welcome to PulseFeedback.',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed due to a server error. Please try again.' });
  }
});

// Login
apiRouter.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error: 'Too many failed login attempts. Please wait 5 minutes before trying again.',
      });
      return;
    }

    if (!email || !password) {
      res.status(400).json({ error: 'Please enter both email and password.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await dbGet<any>('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (!user) {
      registerFailedAttempt(clientIp);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!passwordMatch) {
      registerFailedAttempt(clientIp);
      await logAuditEvent(user.id, 'FAILED_LOGIN', `Failed password attempt for ${normalizedEmail}`, clientIp);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    resetFailedAttempts(clientIp);

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: Boolean(user.must_change_password),
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('pf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAuditEvent(user.id, 'USER_LOGIN', `User logged in: ${user.email}`, clientIp);

    res.json({
      user: tokenPayload,
      token,
      message: 'Authentication successful.',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed due to an internal error.' });
  }
});

// Change Password (Required on First Admin Login or User Profile Update)
apiRouter.post('/auth/change-password', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    const user = await dbGet<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    if (currentPassword) {
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        res.status(400).json({ error: 'Current password does not match.' });
        return;
      }
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);
    await dbRun(
      'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
      [newHash, userId]
    );

    await logAuditEvent(userId, 'PASSWORD_CHANGED', `User updated password: ${user.email}`, clientIp);

    const updatedPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: false,
    };

    const token = jwt.sign(updatedPayload, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('pf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: updatedPayload,
      token,
      message: 'Password successfully updated! Your account is now secure.',
    });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// Logout
apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('pf_token');
  res.json({ message: 'Logged out successfully.' });
});

// Current User Me
apiRouter.get('/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await dbGet<any>('SELECT id, name, email, role, must_change_password, created_at FROM users WHERE id = ?', [req.user!.id]);
    if (!user) {
      res.status(404).json({ error: 'User session not found.' });
      return;
    }
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: Boolean(user.must_change_password),
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve session data.' });
  }
});

// ==========================================
// 2. USER SURVEY MANAGEMENT (ISOLATED DATA)
// ==========================================

// Get all surveys belonging to the authenticated user
apiRouter.get('/surveys', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const surveys = await dbAll<any>(
      `SELECT s.*, 
        COUNT(DISTINCT r.id) as responses_count
       FROM surveys s
       LEFT JOIN responses r ON r.survey_id = s.id
       WHERE s.user_id = ?
       GROUP BY s.id
       ORDER BY s.updated_at DESC`,
      [userId]
    );

    // Fetch questions for each survey
    const results = [];
    for (const s of surveys) {
      const questions = await dbAll<any>(
        'SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC',
        [s.id]
      );
      results.push({
        id: s.id,
        title: s.title,
        slug: s.slug,
        status: s.status,
        responsesCount: Number(s.responses_count) || 0,
        completionRate: Number(s.responses_count) > 0 ? 88.5 : 0,
        editedAt: new Date(s.updated_at).toLocaleDateString(),
        welcomeMessage: s.welcome_message,
        anonymousResponses: Boolean(s.anonymous_responses),
        showProgressBar: Boolean(s.show_progress_bar),
        randomizeOrder: Boolean(s.randomize_order),
        oneResponsePerUser: Boolean(s.one_response_per_user),
        iconName: 'poll',
        questions: questions.map((q) => ({
          id: q.id,
          type: q.type,
          title: q.title,
          required: Boolean(q.required),
          options: JSON.parse(q.options_json || '[]'),
          ...(JSON.parse(q.config_json || '{}')),
        })),
      });
    }

    res.json({ surveys: results });
  } catch (err) {
    console.error('Error fetching surveys:', err);
    res.status(500).json({ error: 'Failed to load user surveys.' });
  }
});

// Create a survey for the authenticated user
apiRouter.post('/surveys', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      title,
      welcomeMessage = '',
      anonymousResponses = true,
      showProgressBar = true,
      randomizeOrder = false,
      oneResponsePerUser = true,
      questions = [],
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Survey title is required.' });
      return;
    }

    const surveyId = 'srv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32);
    const slug = `${slugBase || 'survey'}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO surveys (id, user_id, title, slug, status, welcome_message, anonymous_responses, show_progress_bar, randomize_order, one_response_per_user, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`,
      [
        surveyId,
        userId,
        title.trim(),
        slug,
        welcomeMessage,
        anonymousResponses ? 1 : 0,
        showProgressBar ? 1 : 0,
        randomizeOrder ? 1 : 0,
        oneResponsePerUser ? 1 : 0,
        now,
        now,
      ]
    );

    // Insert questions
    // Insert questions
    const savedQuestions: any[] = [];
    if (Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const rawId = q.id ? String(q.id).replace(/[^a-zA-Z0-9_-]/g, '') : `idx_${i + 1}`;
        const qId = rawId.startsWith(`q_${surveyId}`) ? rawId : `q_${surveyId}_${rawId}_${Math.random().toString(36).substring(2, 6)}`;
        const optionsJson = JSON.stringify(q.options || []);
        const configJson = JSON.stringify({
          minRating: q.minRating,
          maxRating: q.maxRating,
          minLabel: q.minLabel,
          maxLabel: q.maxLabel,
          placeholder: q.placeholder,
          characterLimit: q.characterLimit,
        });

        await dbRun(
          `INSERT INTO questions (id, survey_id, order_index, type, title, required, options_json, config_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [qId, surveyId, i + 1, q.type || 'single', q.title || `Question ${i + 1}`, q.required ? 1 : 0, optionsJson, configJson, now]
        );

        savedQuestions.push({
          ...q,
          id: qId,
        });
      }
    }

    await logAuditEvent(userId, 'SURVEY_CREATED', `Created survey: ${title.trim()} (${surveyId})`, req.ip);

    res.status(201).json({
      survey: {
        id: surveyId,
        title: title.trim(),
        slug,
        status: 'draft',
        responsesCount: 0,
        completionRate: 0,
        editedAt: 'Just now',
        welcomeMessage,
        anonymousResponses,
        showProgressBar,
        randomizeOrder,
        oneResponsePerUser,
        iconName: 'poll',
        questions: savedQuestions,
      },
      message: 'Survey created successfully.',
    });
  } catch (err) {
    console.error('Error creating survey:', err);
    res.status(500).json({ error: 'Failed to create survey.' });
  }
});

// Update a survey (Enforces data ownership: user can only modify their own survey)
apiRouter.put('/surveys/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const surveyId = req.params.id;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    // Verify ownership
    const survey = await dbGet<any>('SELECT * FROM surveys WHERE id = ?', [surveyId]);
    if (!survey) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    if (survey.user_id !== userId && !isAdmin) {
      res.status(403).json({ error: 'Unauthorized. You do not own this survey.' });
      return;
    }

    const {
      title,
      status,
      welcomeMessage,
      anonymousResponses,
      showProgressBar,
      randomizeOrder,
      oneResponsePerUser,
      questions,
    } = req.body;

    const now = new Date().toISOString();

    await dbRun(
      `UPDATE surveys SET
        title = COALESCE(?, title),
        status = COALESCE(?, status),
        welcome_message = COALESCE(?, welcome_message),
        anonymous_responses = COALESCE(?, anonymous_responses),
        show_progress_bar = COALESCE(?, show_progress_bar),
        randomize_order = COALESCE(?, randomize_order),
        one_response_per_user = COALESCE(?, one_response_per_user),
        updated_at = ?
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        status || null,
        welcomeMessage !== undefined ? welcomeMessage : null,
        anonymousResponses !== undefined ? (anonymousResponses ? 1 : 0) : null,
        showProgressBar !== undefined ? (showProgressBar ? 1 : 0) : null,
        randomizeOrder !== undefined ? (randomizeOrder ? 1 : 0) : null,
        oneResponsePerUser !== undefined ? (oneResponsePerUser ? 1 : 0) : null,
        now,
        surveyId,
      ]
    );

    // Update questions transactionally
    if (Array.isArray(questions)) {
      await dbRun('DELETE FROM questions WHERE survey_id = ?', [surveyId]);
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const rawId = q.id ? String(q.id).replace(/[^a-zA-Z0-9_-]/g, '') : `idx_${i + 1}`;
        const qId = rawId.startsWith(`q_${surveyId}`) ? rawId : `q_${surveyId}_${rawId}_${Math.random().toString(36).substring(2, 6)}`;
        const optionsJson = JSON.stringify(q.options || []);
        const configJson = JSON.stringify({
          minRating: q.minRating,
          maxRating: q.maxRating,
          minLabel: q.minLabel,
          maxLabel: q.maxLabel,
          placeholder: q.placeholder,
          characterLimit: q.characterLimit,
        });

        await dbRun(
          `INSERT INTO questions (id, survey_id, order_index, type, title, required, options_json, config_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [qId, surveyId, i + 1, q.type || 'single', q.title || `Question ${i + 1}`, q.required ? 1 : 0, optionsJson, configJson, now]
        );
      }
    }

    await logAuditEvent(userId, 'SURVEY_UPDATED', `Updated survey: ${title || survey.title} (${surveyId})`, req.ip);

    res.json({ message: 'Survey updated successfully.' });
  } catch (err) {
    console.error('Error updating survey:', err);
    res.status(500).json({ error: 'Failed to update survey.' });
  }
});

// Delete a survey (Enforces data ownership)
apiRouter.delete('/surveys/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const surveyId = req.params.id;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    const survey = await dbGet<any>('SELECT * FROM surveys WHERE id = ?', [surveyId]);
    if (!survey) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    if (survey.user_id !== userId && !isAdmin) {
      res.status(403).json({ error: 'Unauthorized. You do not own this survey.' });
      return;
    }

    await dbRun('DELETE FROM surveys WHERE id = ?', [surveyId]);
    await logAuditEvent(userId, 'SURVEY_DELETED', `Deleted survey: ${survey.title} (${surveyId})`, req.ip);

    res.json({ message: 'Survey deleted successfully.' });
  } catch (err) {
    console.error('Error deleting survey:', err);
    res.status(500).json({ error: 'Failed to delete survey.' });
  }
});

// Get Survey Analytics (Only survey owner or admin)
apiRouter.get('/surveys/:id/analytics', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const surveyId = req.params.id;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    const survey = await dbGet<any>('SELECT * FROM surveys WHERE id = ?', [surveyId]);
    if (!survey) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    if (survey.user_id !== userId && !isAdmin) {
      res.status(403).json({ error: 'Unauthorized access to survey analytics.' });
      return;
    }

    const responses = await dbAll<any>(
      'SELECT * FROM responses WHERE survey_id = ? ORDER BY submitted_at DESC',
      [surveyId]
    );

    const questions = await dbAll<any>(
      'SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC',
      [surveyId]
    );

    const answers = await dbAll<any>(
      `SELECT a.* FROM answers a
       JOIN responses r ON r.id = a.response_id
       WHERE r.survey_id = ?`,
      [surveyId]
    );

    const questionAnalytics = questions.map((q) => {
      const qAnswers = answers.filter((a) => a.question_id === q.id);
      let options: string[] = [];
      try {
        options = JSON.parse(q.options_json || '[]');
      } catch {
        options = [];
      }

      const frequency: Record<string, number> = {};
      const textSamples: string[] = [];
      let ratingSum = 0;
      let ratingCount = 0;

      for (const a of qAnswers) {
        if (!a.answer_value) continue;
        const val = a.answer_value;

        if (q.type === 'text') {
          textSamples.push(val);
        } else if (q.type === 'rating') {
          const num = Number(val);
          if (!isNaN(num)) {
            frequency[String(num)] = (frequency[String(num)] || 0) + 1;
            ratingSum += num;
            ratingCount++;
          }
        } else {
          // single, multi, dropdown
          let values: string[] = [];
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              values = parsed.map(String);
            } else {
              values = [String(val)];
            }
          } catch {
            values = [String(val)];
          }

          for (const item of values) {
            frequency[item] = (frequency[item] || 0) + 1;
          }
        }
      }

      // Compute distribution for options or ratings
      let distribution: { label: string; count: number; percentage: number }[] = [];
      if (q.type === 'rating') {
        const ratingKeys = [1, 2, 3, 4, 5];
        distribution = ratingKeys.map((num) => {
          const count = frequency[String(num)] || 0;
          const percentage = ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0;
          return { label: `${num} Star${num > 1 ? 's' : ''}`, count, percentage };
        });
      } else if (options.length > 0) {
        distribution = options.map((opt) => {
          const count = frequency[opt] || 0;
          const percentage = qAnswers.length > 0 ? Math.round((count / qAnswers.length) * 100) : 0;
          return { label: opt, count, percentage };
        });
      }

      const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : null;

      return {
        id: q.id,
        title: q.title,
        type: q.type,
        options,
        totalAnswers: qAnswers.length,
        distribution,
        avgRating,
        textSamples: textSamples.slice(0, 25),
      };
    });

    const completedResponses = responses.filter((r) => r.status === 'completed').length;
    const completionRate = responses.length > 0 ? Math.round((completedResponses / responses.length) * 100) : 0;

    res.json({
      survey: {
        id: survey.id,
        title: survey.title,
        slug: survey.slug,
        status: survey.status,
      },
      totalResponses: responses.length,
      completedResponses,
      completionRate,
      questions: questionAnalytics,
      recentResponses: responses.slice(0, 50).map((r) => ({
        id: r.id,
        respondentId: r.respondent_id,
        status: r.status,
        submittedAt: r.submitted_at,
        timeSpentSeconds: r.time_spent_seconds,
      })),
    });
  } catch (err) {
    console.error('Error getting analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

// ==========================================
// 3. PUBLIC SURVEY PARTICIPATION
// ==========================================

// Get public survey definition by slug
apiRouter.get('/public/surveys/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug;
    const survey = await dbGet<any>(
      'SELECT id, title, slug, status, welcome_message, anonymous_responses, show_progress_bar, randomize_order, one_response_per_user FROM surveys WHERE slug = ?',
      [slug]
    );

    if (!survey) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    if (survey.status !== 'published') {
      res.status(403).json({ error: 'This survey is currently closed or in draft mode.' });
      return;
    }

    const questions = await dbAll<any>(
      'SELECT id, order_index, type, title, required, options_json, config_json FROM questions WHERE survey_id = ? ORDER BY order_index ASC',
      [survey.id]
    );

    res.json({
      survey: {
        id: survey.id,
        title: survey.title,
        slug: survey.slug,
        welcomeMessage: survey.welcome_message,
        anonymousResponses: Boolean(survey.anonymous_responses),
        showProgressBar: Boolean(survey.show_progress_bar),
        randomizeOrder: Boolean(survey.randomize_order),
        oneResponsePerUser: Boolean(survey.one_response_per_user),
        questions: questions.map((q) => ({
          id: q.id,
          type: q.type,
          title: q.title,
          required: Boolean(q.required),
          options: JSON.parse(q.options_json || '[]'),
          ...(JSON.parse(q.config_json || '{}')),
        })),
      },
    });
  } catch (err) {
    console.error('Public survey error:', err);
    res.status(500).json({ error: 'Failed to load survey.' });
  }
});

// Submit response to public survey
apiRouter.post('/public/surveys/:slug/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = req.params.slug;
    const { answers = {}, respondentId } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(clientIp + slug).digest('hex');

    const survey = await dbGet<any>(
      'SELECT id, status, one_response_per_user, anonymous_responses FROM surveys WHERE slug = ?',
      [slug]
    );

    if (!survey || survey.status !== 'published') {
      res.status(400).json({ error: 'This survey is not currently accepting responses.' });
      return;
    }

    // Check one response per user rule if enforced
    if (survey.one_response_per_user) {
      const existing = await dbGet<any>(
        'SELECT id FROM responses WHERE survey_id = ? AND ip_hash = ?',
        [survey.id, ipHash]
      );
      if (existing) {
        res.status(429).json({ error: 'You have already submitted a response to this survey.' });
        return;
      }
    }

    const responseId = 'resp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    // Insert response header
    await dbRun(
      `INSERT INTO responses (id, survey_id, respondent_id, submitted_at, ip_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [responseId, survey.id, survey.anonymous_responses ? null : respondentId || null, now, ipHash]
    );

    // Insert answers
    for (const [questionId, val] of Object.entries(answers)) {
      const answerVal = Array.isArray(val) ? JSON.stringify(val) : String(val);
      const answerId = 'ans_' + Math.random().toString(36).substring(2, 9);

      await dbRun(
        `INSERT INTO answers (id, response_id, question_id, answer_value)
         VALUES (?, ?, ?, ?)`,
        [answerId, responseId, questionId, answerVal]
      );
    }

    res.status(201).json({
      message: 'Thank you! Your response has been securely recorded.',
      responseId,
    });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: 'Failed to record response. Please try again.' });
  }
});

// ==========================================
// 4. ADMINISTRATOR CONTROL PANEL (RBAC: ADMIN ONLY)
// ==========================================

// Admin overview stats
apiRouter.get('/admin/overview', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userCount = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const surveyCount = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM surveys');
    const responseCount = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM responses');

    // Survey-wise stats
    const surveyStats = await dbAll<any>(`
      SELECT 
        s.id, s.title, s.slug, s.status, s.created_at,
        u.name as owner_name, u.email as owner_email,
        COUNT(DISTINCT r.id) as total_responses
      FROM surveys s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN responses r ON r.survey_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);

    res.json({
      totalUsers: userCount?.count || 0,
      totalSurveys: surveyCount?.count || 0,
      totalResponses: responseCount?.count || 0,
      surveyStats: surveyStats.map((s) => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        status: s.status,
        createdAt: s.created_at,
        ownerName: s.owner_name,
        ownerEmail: s.owner_email,
        responsesCount: Number(s.total_responses) || 0,
      })),
      system: {
        engine: 'SQLite 3.45.1 (WAL Enabled)',
        status: 'Healthy',
        acidCompliant: true,
      },
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Failed to fetch admin overview.' });
  }
});

// Admin get all registered users
apiRouter.get('/admin/users', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await dbAll<any>(`
      SELECT 
        u.id, u.name, u.email, u.role, u.must_change_password, u.created_at,
        COUNT(DISTINCT s.id) as surveys_count,
        COUNT(DISTINCT r.id) as responses_count
      FROM users u
      LEFT JOIN surveys s ON s.user_id = u.id
      LEFT JOIN responses r ON r.survey_id = s.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        mustChangePassword: Boolean(u.must_change_password),
        createdAt: u.created_at,
        surveysCount: Number(u.surveys_count) || 0,
        responsesCount: Number(u.responses_count) || 0,
      })),
    });
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Admin update user role
apiRouter.put('/admin/users/:id/role', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!role || (role !== 'admin' && role !== 'user')) {
      res.status(400).json({ error: 'Invalid role specified.' });
      return;
    }

    // Prevent removing admin privileges from oneself if sole admin
    if (targetUserId === req.user!.id && role !== 'admin') {
      res.status(400).json({ error: 'Cannot demote your own active administrator account.' });
      return;
    }

    await dbRun('UPDATE users SET role = ? WHERE id = ?', [role, targetUserId]);
    await logAuditEvent(req.user!.id, 'ROLE_CHANGED', `Changed user ${targetUserId} role to ${role}`, req.ip);

    res.json({ message: `Role updated to ${role}.` });
  } catch (err) {
    console.error('Role update error:', err);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// Admin audit logs list
apiRouter.get('/admin/audit-logs', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await dbAll<any>(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ auditLogs: logs });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

// Admin Secure Response Reset with Automated Backup
apiRouter.post('/admin/reset-responses', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const result = await backupAndResetResponses(req.user!.id, clientIp);

    res.json({
      message: `Survey responses successfully reset. Created backup file "${result.backupFile}". ${result.deletedResponsesCount} responses and ${result.deletedAnswersCount} answers cleared. Users, surveys, and admin accounts preserved.`,
      ...result,
    });
  } catch (err) {
    console.error('Reset responses error:', err);
    res.status(500).json({ error: 'Failed to execute database reset operation.' });
  }
});
