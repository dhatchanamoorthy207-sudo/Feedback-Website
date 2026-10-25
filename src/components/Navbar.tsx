import React, { useState } from 'react';
import { UserSession } from '../services/api';

interface NavbarProps {
  isAdminMode: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onTogglePortal: () => void;
  onNavigateToLogin: () => void;
  onNotificationClick: () => void;
  currentUser?: UserSession | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAdminMode,
  searchQuery,
  onSearchChange,
  onTogglePortal,
  onNavigateToLogin,
  onNotificationClick,
  currentUser,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);

  const userName = currentUser?.name || (isAdminMode ? 'Administrator' : 'User');
  const userEmail = currentUser?.email || '';
  const userRole = currentUser?.role === 'admin' ? 'Administrator' : 'User / Researcher';

  // Compute initials
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/30 z-40 flex items-center justify-between px-space-xl">
      {/* Left side search & portal badge */}
      <div className="flex items-center gap-space-md flex-1 max-w-xl">
        {!isAdminMode ? (
          <div className="inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold shrink-0">
            <span className="material-symbols-outlined text-[14px]">badge</span>
            <span>User Workspace</span>
          </div>
        ) : (
          <div className="hidden md:inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold shrink-0">
            <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
            <span>Admin Console</span>
          </div>
        )}

        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isAdminMode ? 'Search users, surveys, or audit logs...' : 'Filter surveys or metrics...'}
            className="w-full pl-9 pr-space-md py-1.5 bg-surface-container-low text-on-surface placeholder:text-outline border border-outline-variant/40 rounded-lg font-body-sm text-body-sm focus:outline-none focus:border-primary-container focus:bg-surface-container-lowest transition-colors"
          />
        </div>
      </div>

      {/* Right side status, notification, and profile */}
      <div className="flex items-center gap-space-lg">
        {isAdminMode && (
          <div className="hidden lg:flex items-center gap-space-xs px-space-sm py-1 bg-surface-container rounded-lg text-on-surface font-label-sm text-label-sm font-medium">
            <span className="material-symbols-outlined text-tertiary text-[16px]">verified_user</span>
            <span>Persistent SQLite</span>
          </div>
        )}

        <button
          type="button"
          onClick={onNotificationClick}
          aria-label="Notifications"
          className="relative p-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>

        <div className="h-6 w-px bg-outline-variant/40"></div>

        {/* User profile dropdown trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-space-sm cursor-pointer py-1 px-space-xs rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs shadow-xs">
              {initials}
            </div>
            <div className="flex flex-col text-left">
              <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight">
                {userName}
              </span>
              <span className="font-label-sm text-label-sm text-outline leading-tight">
                {userRole}
              </span>
            </div>
            <span className="material-symbols-outlined text-outline text-[18px]">expand_more</span>
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div
              className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setProfileOpen(false)}
            >
              <div className="px-4 py-2 border-b border-outline-variant/20">
                <p className="font-label-md text-sm text-on-surface font-semibold truncate">
                  {userName}
                </p>
                <p className="font-body-sm text-xs text-outline truncate">
                  {userEmail}
                </p>
              </div>

              <div className="py-1">
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={onTogglePortal}
                    className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2 font-label-md cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      {!isAdminMode ? 'admin_panel_settings' : 'account_circle'}
                    </span>
                    <span>{!isAdminMode ? 'Switch to Admin Console' : 'Switch to User Portal'}</span>
                  </button>
                )}
              </div>

              <div className="border-t border-outline-variant/20 pt-1">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container/20 flex items-center gap-2 font-label-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
