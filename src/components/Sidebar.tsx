import React from 'react';

interface SidebarProps {
  currentView:
    | 'dashboard'
    | 'builder'
    | 'analytics'
    | 'surveys'
    | 'admin-overview'
    | 'admin-users'
    | 'admin-surveys'
    | 'admin-audit'
    | 'login';
  onNavigate: (
    view:
      | 'dashboard'
      | 'builder'
      | 'analytics'
      | 'surveys'
      | 'admin-overview'
      | 'admin-users'
      | 'admin-surveys'
      | 'admin-audit'
      | 'login'
  ) => void;
  isAdminMode: boolean;
  onTogglePortal: () => void;
  currentUserRole?: 'admin' | 'user';
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isAdminMode,
  onTogglePortal,
  currentUserRole,
  onLogout,
}) => {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-outline-variant/30 z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand header */}
        <div className="h-16 px-space-lg flex items-center justify-between gap-space-sm border-b border-outline-variant/20 bg-surface-container-lowest shrink-0">
          <div
            className="flex items-center gap-space-sm cursor-pointer"
            onClick={() => onNavigate(isAdminMode ? 'admin-overview' : 'dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold shadow-xs">
              <span className="material-symbols-outlined text-[20px]">stacked_line_chart</span>
            </div>
            <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-bold">
              PulseFeedback
            </span>
          </div>
          {isAdminMode && (
            <span className="bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-label-sm text-label-sm uppercase font-semibold">
              Admin
            </span>
          )}
        </div>

        {/* Navigation Section */}
        <div className="p-space-md">
          <p className="px-space-sm pb-space-xs font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
            {isAdminMode ? 'Governance & Control' : 'Survey Management'}
          </p>

          {!isAdminMode ? (
            <nav className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className={`w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors text-left font-label-md text-label-md cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                <span>Dashboard Overview</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('surveys')}
                className={`w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors text-left font-label-md text-label-md cursor-pointer ${
                  currentView === 'surveys'
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">ballot</span>
                <span>My Surveys</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('builder')}
                className={`w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors text-left font-label-md text-label-md cursor-pointer ${
                  currentView === 'builder'
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
                <span>Survey Builder</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('analytics')}
                className={`w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors text-left font-label-md text-label-md cursor-pointer ${
                  currentView === 'analytics'
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">insights</span>
                <span>Live Analytics</span>
              </button>
            </nav>
          ) : (
            <nav className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => onNavigate('admin-overview')}
                className={`w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors text-left font-label-md text-label-md cursor-pointer ${
                  currentView === 'admin-overview'
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                <span>Admin Overview</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('admin-users')}
                className={`w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors text-left font-label-md text-label-md cursor-pointer ${
                  currentView === 'admin-users'
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">group</span>
                <span>User Management</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('admin-surveys')}
                className={`w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors text-left font-label-md text-label-md cursor-pointer ${
                  currentView === 'admin-surveys'
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">assignment</span>
                <span>Platform Surveys</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('admin-audit')}
                className={`w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-colors text-left font-label-md text-label-md cursor-pointer ${
                  currentView === 'admin-audit'
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">security</span>
                <span>Security Audit Log</span>
              </button>
            </nav>
          )}

          <div className="my-space-md border-t border-outline-variant/20"></div>

          {/* System Section */}
          <p className="px-space-sm pb-space-xs font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
            System &amp; Session
          </p>
          <nav className="flex flex-col gap-1">
            {currentUserRole === 'admin' && (
              <button
                type="button"
                onClick={() => onTogglePortal()}
                className="w-full flex items-center justify-between px-space-md py-space-sm rounded-lg text-secondary hover:bg-surface-container-low transition-colors font-label-md text-label-md text-left cursor-pointer"
                title={isAdminMode ? 'Switch to User Portal' : 'Switch to Administrator Console'}
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">
                    {isAdminMode ? 'switch_account' : 'admin_panel_settings'}
                  </span>
                  <span>{isAdminMode ? 'Exit to User Portal' : 'Admin Console'}</span>
                </div>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-error hover:bg-error-container/20 transition-colors font-label-md text-label-md text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span>Sign Out</span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-space-md border-t border-outline-variant/20 bg-surface-container-low/50 shrink-0">
        <div className="flex flex-col gap-1 font-code-sm text-[11px] text-on-surface-variant px-space-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary inline-block"></span>
            <span>Persistent SQLite DB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
            <span>Bcrypt + JWT Secured</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
