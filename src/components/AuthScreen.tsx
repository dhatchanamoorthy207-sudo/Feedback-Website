import React, { useState } from 'react';
import { api, UserSession } from '../services/api';

interface AuthScreenProps {
  onLoginSuccess: (user: UserSession) => void;
  onShowToast: (message: string, icon?: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  onShowToast,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  // Status & loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forced password change modal (for admin first login)
  const [pendingUser, setPendingUser] = useState<UserSession | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmNewAdminPassword, setConfirmNewAdminPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handlePasswordKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!email.trim() || !password) {
      setErrorMessage('Please enter all required fields.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        const { user } = await api.auth.register(name, email, password);
        onShowToast(`Welcome, ${user.name}! Account registered successfully.`, 'verified');
        onLoginSuccess(user);
      } else {
        const { user } = await api.auth.login(email, password);

        // Check if mandatory password change is required (e.g. initial admin login)
        if (user.mustChangePassword) {
          setPendingUser(user);
          onShowToast('Initial password detected. Please set a new secure password.', 'lock_reset');
          setIsLoading(false);
          return;
        }

        onShowToast(`Welcome back, ${user.name}!`, 'verified');
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPassword || newAdminPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (newAdminPassword !== confirmNewAdminPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { user } = await api.auth.changePassword(newAdminPassword, password);
      onShowToast('Administrator password updated successfully! Session secured.', 'shield');
      setPendingUser(null);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update administrator password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-space-md bg-background">
      <div className="flex flex-col items-center justify-center w-full py-space-xl px-space-md">
        {/* Main Authentication Card */}
        <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden relative border border-outline-variant/30">
          {/* Top Subtle Security Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-secondary to-primary"></div>

          <div className="p-space-lg sm:p-space-xl flex flex-col">
            {/* Brand Identity Header */}
            <div className="flex flex-col items-center text-center mb-space-lg">
              <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary mb-space-sm shadow-md">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  insights
                </span>
              </div>
              <div className="flex items-center gap-space-xs justify-center">
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                  PulseFeedback
                </h1>
                <span className="bg-surface-container-high text-primary px-space-xs py-0.5 rounded font-label-sm text-label-sm font-semibold">
                  ENTERPRISE
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs max-w-sm">
                Secure access to surveys, analytics, and administrative governance
              </p>
            </div>

            {/* Mode Switcher: Sign In vs Register */}
            <div className="bg-surface-container-low p-1 rounded-lg flex mb-space-lg shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 px-space-sm rounded-md font-label-md text-label-md transition-all cursor-pointer text-center ${
                  mode === 'login'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 px-space-sm rounded-md font-label-md text-label-md transition-all cursor-pointer text-center ${
                  mode === 'register'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="mb-space-md p-space-sm bg-error-container/40 text-error rounded-lg flex items-start gap-space-xs text-xs font-semibold animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-space-md">
              {/* Name field (Only in Register mode) */}
              {mode === 'register' && (
                <div className="flex flex-col gap-space-xs animate-in fade-in">
                  <label className="font-label-md text-label-md text-on-surface flex items-center gap-1" htmlFor="name">
                    Full Name <span className="text-error font-semibold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-outline text-[18px] pointer-events-none">
                      person
                    </span>
                    <input
                      id="name"
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg shadow-sm border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                    />
                  </div>
                </div>
              )}

              {/* Email Input Field */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface flex items-center gap-1" htmlFor="email">
                  Corporate Email Address <span className="text-error font-semibold">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-[18px] pointer-events-none">
                    mail
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@company.com or plus10@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg shadow-sm border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                  />
                  {email.includes('@') && email.includes('.') && (
                    <span
                      className="material-symbols-outlined absolute right-3 text-tertiary-container text-[20px] pointer-events-none"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  )}
                </div>
              </div>

              {/* Password Input Field */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex justify-between items-center">
                  <label className="font-label-md text-label-md text-on-surface flex items-center gap-1" htmlFor="password">
                    Password <span className="text-error font-semibold">*</span>
                  </label>
                  {capsLockOn && (
                    <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-error bg-error-container/40 px-1.5 py-0.5 rounded">
                      <span className="material-symbols-outlined text-[14px]">keyboard_capslock</span>
                      CAPS LOCK ON
                    </span>
                  )}
                </div>

                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-[18px] pointer-events-none">
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handlePasswordKeyUp}
                    placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
                    className="w-full pl-9 pr-11 py-2.5 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg shadow-sm border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-2.5 p-1 text-outline hover:text-on-surface focus:outline-none flex items-center justify-center rounded cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Password (Only in Register mode) */}
              {mode === 'register' && (
                <div className="flex flex-col gap-space-xs animate-in fade-in">
                  <label className="font-label-md text-label-md text-on-surface flex items-center gap-1" htmlFor="confirmPassword">
                    Confirm Password <span className="text-error font-semibold">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-outline text-[18px] pointer-events-none">
                      lock_reset
                    </span>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type your password"
                      className="w-full pl-9 pr-4 py-2.5 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg shadow-sm border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-space-xs">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md py-3 px-space-md rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-primary-fixed cursor-pointer font-bold disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        {mode === 'register' ? 'person_add' : 'enhanced_encryption'}
                      </span>
                      <span>{mode === 'register' ? 'Complete Registration' : 'Sign In to Account'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Information Notice */}
            <div className="mt-space-md p-space-sm bg-surface-container-low rounded-lg text-xs text-on-surface-variant flex items-start gap-2 border border-outline-variant/30">
              <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5 shrink-0">info</span>
              <p className="leading-relaxed">
                <strong className="text-on-surface">Setup note:</strong> The administrator account{' '}
                <code className="bg-surface-container px-1 py-0.5 rounded text-primary font-mono">plus10@gmail.com</code> is seeded with a temporary initial password. On first sign-in, you will be prompted to replace it with a private password.
              </p>
            </div>

            {/* Security Badges Footer */}
            <div className="mt-space-lg pt-space-md bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-space-xs">
              <div className="flex items-center gap-1.5 text-on-surface font-label-sm text-label-sm font-semibold">
                <span className="material-symbols-outlined text-tertiary-container text-[16px]">shield</span>
                <span>Security &amp; Hardening Standards</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Protected by <span className="font-semibold text-on-surface">bcrypt 12-round password hashing</span>, progressive brute-force rate-limiting, and parameterized SQLite persistence.
              </p>
            </div>
          </div>
        </div>

        {/* Footer notes */}
        <div className="w-full max-w-[480px] mt-space-md flex flex-wrap items-center justify-center gap-x-space-md gap-y-1 font-label-sm text-label-sm text-outline">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            SOC2 Type II Compliant
          </span>
          <span className="inline-block w-1 h-1 rounded-full bg-outline"></span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">database</span>
            ACID SQLite WAL Store
          </span>
          <span className="inline-block w-1 h-1 rounded-full bg-outline"></span>
          <span>TLS 1.3 Strict</span>
        </div>
      </div>

      {/* Mandatory First-Time Password Change Modal for Admin */}
      {pendingUser && (
        <div className="fixed inset-0 z-50 bg-[#0d1c2e]/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full p-6 sm:p-8 rounded-2xl shadow-2xl border border-outline-variant/40 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center mb-4 shadow-sm">
              <span className="material-symbols-outlined text-2xl">lock_reset</span>
            </div>

            <h2 className="font-headline-sm text-xl font-bold text-on-surface mb-2">
              Mandatory Security Setup
            </h2>
            <p className="font-body-sm text-sm text-on-surface-variant mb-6 leading-relaxed">
              Welcome, <strong className="text-on-surface">{pendingUser.name}</strong>. You are logging in with the initial temporary administrator password. You must change your password now to secure your account and gain access to the Admin Dashboard.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-error-container/40 text-error rounded-lg text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAdminPasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-outline uppercase mb-1">
                  New Secure Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full px-3 py-2.5 bg-surface-container-low rounded-lg text-sm text-on-surface outline-none border border-outline-variant/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-outline uppercase mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewAdminPassword}
                  onChange={(e) => setConfirmNewAdminPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2.5 bg-surface-container-low rounded-lg text-sm text-on-surface outline-none border border-outline-variant/40 focus:border-primary"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full py-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md font-semibold transition-all cursor-pointer shadow-md disabled:opacity-60"
                >
                  {isUpdatingPassword ? 'Updating Password...' : 'Save Password & Enter Dashboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
