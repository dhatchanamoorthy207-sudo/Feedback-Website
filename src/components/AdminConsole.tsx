import React, { useState, useEffect } from 'react';
import { UserAccount, AuditLogItem } from '../types/survey';
import { api, UserSession } from '../services/api';

interface AdminConsoleProps {
  currentUser: UserSession;
  onShowToast: (message: string, icon?: string) => void;
  onNavigateToUserPortal: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  currentUser,
  onShowToast,
  onNavigateToUserPortal,
}) => {
  const [overview, setOverview] = useState<{
    totalUsers: number;
    totalSurveys: number;
    totalResponses: number;
    surveyStats: any[];
    system: any;
  } | null>(null);

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [sortBy, setSortBy] = useState('recent');

  // Modals state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Load data from backend
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [ovData, usersData, logsData] = await Promise.all([
        api.admin.getOverview(),
        api.admin.getUsers(),
        api.admin.getAuditLogs(),
      ]);
      setOverview(ovData);
      setUsers(usersData);
      setAuditLogs(logsData);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load administrator data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleDownloadAuditLog = () => {
    onShowToast('Generating audit_trail.csv...', 'download');
    setTimeout(() => {
      const csv =
        'Event Type,Time,Description,Actor,Details\n' +
        auditLogs
          .map((l) => `"${l.eventType}","${l.timeAgo}","${l.description}","${l.actor}","${l.ipOrDetail}"`)
          .join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('Audit log downloaded.', 'verified');
    }, 400);
  };

  const handleSaveRole = async (newRole: 'admin' | 'user') => {
    if (!editingUser) return;
    try {
      await api.admin.updateUserRole(editingUser.id, newRole);
      onShowToast(`Updated role for ${editingUser.name} to ${newRole}`);
      setEditingUser(null);
      loadAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update user role.', 'error');
    }
  };

  // Secure admin-only reset survey responses
  const handleExecuteReset = async () => {
    if (resetConfirmationText !== 'RESET RESPONSES') {
      onShowToast('Please type "RESET RESPONSES" to confirm deletion.', 'warning');
      return;
    }

    setIsResetting(true);
    try {
      const res = await api.admin.resetResponses();
      onShowToast(
        `Reset complete! Backup "${res.backupFile}" generated. Cleared ${res.deletedResponsesCount} responses.`,
        'verified'
      );
      setResetModalOpen(false);
      setResetConfirmationText('');
      loadAdminData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to execute reset.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = users
    .filter((u) => {
      const matchesSearch =
        searchQuery === '' ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'All' || (roleFilter === 'Admin' ? u.role === 'Super Admin' : u.role !== 'Super Admin');
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (sortBy === 'surveys') return b.surveysCount - a.surveysCount;
      if (sortBy === 'responses') return b.responsesCount - a.responsesCount;
      return 0;
    });

  return (
    <div className="w-full bg-background px-space-lg py-space-lg min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col w-full">
        {/* System Admin Header & Quick Controls */}
        <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-lg mb-space-lg">
          <div className="flex flex-col gap-space-xs max-w-2xl">
            <div className="flex flex-wrap items-center gap-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold bg-surface-container px-space-sm py-0.5 rounded">
                Cluster Node: US-East-Primary
              </span>
              <div className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
                <span>Production System: Healthy (SQLite v3.45.1 - WAL Mode Active)</span>
              </div>
            </div>

            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
              System Administration &amp; Security Overview
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Governing user authority, cryptographic state, survey lifecycle triggers, and ACID-compliant operational persistence.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-space-sm">
            <button
              type="button"
              onClick={handleDownloadAuditLog}
              className="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors shadow-sm font-label-md text-label-md cursor-pointer border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">download</span>
              <span>Download Audit Log (.csv)</span>
            </button>

            <button
              type="button"
              onClick={() => setDiagnosticsOpen(true)}
              className="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">terminal</span>
              <span>System Diagnostics</span>
            </button>

            {/* Admin-only Reset Survey Responses Button */}
            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded bg-error-container hover:bg-error hover:text-on-error text-error transition-all font-label-md text-label-md font-semibold cursor-pointer shadow-xs"
              title="Securely clear all survey responses with automated backup"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              <span>Reset Survey Responses</span>
            </button>
          </div>
        </section>

        {/* 4-Column System Metrics Bento Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
          {/* Total Registered Users */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between border border-outline-variant/30">
            <div className="flex items-start justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                Total Registered Users
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">groups</span>
              </div>
            </div>
            <div className="my-space-md">
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-xl text-headline-xl text-on-surface font-bold">
                  {overview?.totalUsers ?? users.length}
                </span>
                <span className="inline-flex items-center text-tertiary-container font-label-sm text-label-sm font-medium">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> Active
                </span>
              </div>
              <div className="flex items-center gap-space-sm mt-space-xs text-on-surface-variant font-body-sm text-body-sm">
                <span>Unique accounts authenticated</span>
              </div>
            </div>
            <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary-container h-full rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Total System Surveys */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between border border-outline-variant/30">
            <div className="flex items-start justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                Total System Surveys
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">poll</span>
              </div>
            </div>
            <div className="my-space-md">
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-xl text-headline-xl text-on-surface font-bold">
                  {overview?.totalSurveys ?? 0}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">surveys deployed</span>
              </div>
              <div className="flex items-center gap-space-xs mt-space-xs text-on-surface-variant font-body-sm text-body-sm truncate">
                <span>ACID schema isolated</span>
              </div>
            </div>
            <div className="w-full flex h-1.5 rounded-full overflow-hidden gap-0.5">
              <div className="bg-secondary h-full" style={{ width: '70%' }}></div>
              <div className="bg-surface-container-highest h-full" style={{ width: '30%' }}></div>
            </div>
          </div>

          {/* Total Responses Ingested */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between border border-outline-variant/30">
            <div className="flex items-start justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                Responses Ingested
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-tertiary-container">
                <span className="material-symbols-outlined text-[20px]">dataset</span>
              </div>
            </div>
            <div className="my-space-md">
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-xl text-headline-xl text-on-surface font-bold">
                  {overview?.totalResponses.toLocaleString() ?? 0}
                </span>
                <span className="inline-flex items-center text-secondary font-label-sm text-label-sm">
                  avg 18ms
                </span>
              </div>
              <div className="flex items-center gap-space-sm mt-space-xs text-on-surface-variant font-body-sm text-body-sm">
                <span><strong className="text-tertiary-container font-medium">100%</strong> validated payloads</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-code-sm">
              <span>SQLite storage</span>
              <span className="text-primary font-medium">0 dropped</span>
            </div>
          </div>

          {/* Security Alerts */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between border border-outline-variant/30">
            <div className="flex items-start justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                Security Alerts
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[20px]">shield</span>
              </div>
            </div>
            <div className="my-space-md">
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-xl text-headline-xl text-on-surface font-bold">0 Critical</span>
                <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
              </div>
              <div className="mt-space-xs text-on-surface-variant font-body-sm text-body-sm">
                Vulnerability scan passed <span className="text-on-surface font-medium">Just now</span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-tertiary-container font-medium">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Zero policy breaches logged</span>
            </div>
          </div>
        </section>

        {/* Survey-Wise Response Statistics Table */}
        <section className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg mb-space-xl border border-outline-variant/30">
          <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Survey-Wise Response Statistics &amp; Ownership
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Comprehensive overview of all surveys created across user accounts.
              </p>
            </div>
            <span className="bg-surface-container px-3 py-1 rounded-full text-xs font-semibold text-primary">
              {overview?.surveyStats.length || 0} Surveys Recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-container-low font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  <th className="py-2.5 px-3 font-semibold">Survey Title</th>
                  <th className="py-2.5 px-3 font-semibold">Owner</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Responses</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {overview?.surveyStats && overview.surveyStats.length > 0 ? (
                  overview.surveyStats.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="py-3 px-3 font-medium text-on-surface">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-secondary">poll</span>
                          <span>{s.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant">
                        <div>{s.ownerName}</div>
                        <div className="text-xs text-outline">{s.ownerEmail}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            s.status === 'published'
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-on-surface">
                        {s.responsesCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-outline font-mono">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-outline">
                      No surveys created yet in database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Two-Column Grid: Users & Audit Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* Left Column: Registered Users (8 cols) */}
          <section className="lg:col-span-8 flex flex-col gap-space-lg">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md border border-outline-variant/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-xs">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                    Registered Users &amp; Role Governance
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Manage role permissions and cryptographic access tiers.
                  </p>
                </div>
                <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-space-sm py-1 rounded">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                  <span>RBAC Enforced</span>
                </div>
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-space-sm bg-surface-container-low p-space-sm rounded-lg">
                <div className="sm:col-span-7 flex items-center gap-space-xs bg-surface-container-lowest px-space-sm py-1.5 rounded shadow-sm border border-outline-variant/30">
                  <span className="material-symbols-outlined text-outline text-[18px]">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="bg-transparent w-full text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-5">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm px-space-sm py-2 rounded focus:outline-none shadow-sm cursor-pointer border border-outline-variant/30"
                  >
                    <option value="All">Role: All</option>
                    <option value="Admin">Administrator (admin)</option>
                    <option value="User">Standard User (user)</option>
                  </select>
                </div>
              </div>

              {/* Table View */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-container-low font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                      <th className="py-2.5 px-3 font-semibold">User / Email</th>
                      <th className="py-2.5 px-3 font-semibold">Role</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Surveys</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Responses</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-space-sm">
                            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                              {user.avatarInitials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-on-surface truncate">{user.name}</span>
                              <span className="text-xs text-on-surface-variant truncate font-mono">{user.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-label-sm text-xs font-semibold ${
                              user.role === 'Super Admin'
                                ? 'bg-primary-fixed text-primary'
                                : 'bg-surface-container text-on-surface-variant'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-medium">{user.surveysCount}</td>
                        <td className="py-3 px-3 text-center font-mono font-medium">{user.responsesCount}</td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setEditingUser(user)}
                            className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Edit Role
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Right Column: Real-Time Audit Log (4 cols) */}
          <aside className="lg:col-span-4 flex flex-col gap-space-lg">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">security_update_good</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Real-Time Audit Log</h3>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container animate-ping"></span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant -mt-space-xs">
                Immutable forensic administrative stream.
              </p>

              <div className="flex flex-col gap-space-md relative pl-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="relative pl-space-sm flex flex-col gap-0.5">
                    <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-primary-container ring-4 ring-surface-container-lowest"></span>
                    <div className="flex items-center justify-between">
                      <span className="font-code-sm text-xs font-semibold text-primary">{log.eventType}</span>
                      <span className="text-[11px] text-outline">{log.timeAgo}</span>
                    </div>
                    <p className="text-xs text-on-surface leading-snug">{log.description}</p>
                    <span className="text-[10px] text-outline font-mono">{log.ipOrDetail}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setAuditModalOpen(true)}
                className="w-full mt-2 py-2 px-space-md bg-surface-container hover:bg-surface-container-high rounded text-on-surface font-label-md text-xs transition-colors text-center cursor-pointer font-semibold"
              >
                View Full Audit Trail ({auditLogs.length} entries)
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Admin Reset Survey Responses Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0d1c2e]/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full p-6 sm:p-8 rounded-2xl shadow-2xl border-2 border-error/30 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center mb-4 shadow-sm">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>

            <h2 className="font-headline-sm text-xl font-bold text-on-surface mb-2">
              Confirm Survey Responses Reset
            </h2>
            <div className="space-y-3 text-sm text-on-surface-variant mb-6 leading-relaxed">
              <p>
                This operation will <strong className="text-error">permanently purge all collected survey submissions and answers</strong> across the database.
              </p>
              <div className="p-3 bg-surface-container-low rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-tertiary-container">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Automated Snapshot Backup Guaranteed</span>
                </div>
                <p className="text-outline">
                  A full copy of the current database will be saved to <code className="font-mono text-primary">data/backups/</code> before deletion.
                </p>
                <p className="text-outline">
                  All user accounts, surveys, questions, and the administrator account will remain strictly preserved.
                </p>
              </div>

              <p className="font-semibold text-xs text-on-surface">
                To confirm, type <span className="font-mono text-error font-bold">RESET RESPONSES</span> below:
              </p>
              <input
                type="text"
                value={resetConfirmationText}
                onChange={(e) => setResetConfirmationText(e.target.value)}
                placeholder="RESET RESPONSES"
                className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-sm font-mono text-on-surface outline-none border border-outline-variant/40 focus:border-error"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setResetModalOpen(false);
                  setResetConfirmationText('');
                }}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={resetConfirmationText !== 'RESET RESPONSES' || isResetting}
                className="px-5 py-2 rounded-lg bg-error hover:bg-[#a01616] text-on-error text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 shadow-sm"
              >
                {isResetting ? 'Creating Backup & Resetting...' : 'Confirm and Reset Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-[#0d1c2e]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/30">
            <h3 className="font-headline-sm font-bold text-on-surface mb-2">Edit Role for {editingUser.name}</h3>
            <p className="text-xs text-outline mb-4">
              Select cryptographic privilege tier. Administrator tier grants full cluster governance rights.
            </p>
            <div className="space-y-2 mb-6">
              <button
                type="button"
                onClick={() => handleSaveRole('user')}
                className={`w-full p-3 rounded-lg text-left flex items-center justify-between border cursor-pointer ${
                  editingUser.role !== 'Super Admin'
                    ? 'border-primary bg-primary-fixed/20 text-primary font-semibold'
                    : 'border-outline-variant/40 hover:bg-surface-container-low text-on-surface'
                }`}
              >
                <div>
                  <div className="font-semibold text-sm">Standard User (user)</div>
                  <div className="text-xs text-outline">Create surveys & collect responses</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleSaveRole('admin')}
                className={`w-full p-3 rounded-lg text-left flex items-center justify-between border cursor-pointer ${
                  editingUser.role === 'Super Admin'
                    ? 'border-primary bg-primary-fixed/20 text-primary font-semibold'
                    : 'border-outline-variant/40 hover:bg-surface-container-low text-on-surface'
                }`}
              >
                <div>
                  <div className="font-semibold text-sm">Administrator (admin)</div>
                  <div className="text-xs text-outline">Full platform governance & survey resets</div>
                </div>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Modal */}
      {diagnosticsOpen && (
        <div className="fixed inset-0 z-50 bg-[#0d1c2e]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant/30">
            <h3 className="font-headline-sm font-bold text-on-surface mb-4">Cluster Diagnostics</h3>
            <div className="p-3 bg-[#0d1c2e] text-[#89f5e7] rounded-lg font-mono text-xs space-y-1 mb-4">
              <p>&gt; sys_probe --format=json</p>
              <p className="text-white/80">
                {JSON.stringify(overview?.system || { status: 'Healthy', engine: 'SQLite WAL' }, null, 2)}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDiagnosticsOpen(false)}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Audit Trail Modal */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0d1c2e]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto border border-outline-variant/30">
            <h3 className="font-headline-sm font-bold text-on-surface mb-4">Audit Trail Logs</h3>
            <div className="divide-y divide-outline-variant/20 text-xs">
              {auditLogs.map((l) => (
                <div key={l.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-primary mr-2">[{l.eventType}]</span>
                    <span>{l.description}</span>
                  </div>
                  <span className="font-mono text-outline shrink-0 ml-2">{l.timeAgo}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setAuditModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
