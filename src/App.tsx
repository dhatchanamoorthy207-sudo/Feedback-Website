import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { SurveyBuilder } from './components/SurveyBuilder';
import { AdminConsole } from './components/AdminConsole';
import { AuthScreen } from './components/AuthScreen';
import { RespondentSurveyView } from './components/RespondentSurveyView';
import { AnalyticsView } from './components/AnalyticsView';
import { Toast } from './components/Toast';
import { TEMPLATES } from './data/mockData';
import { Survey } from './types/survey';
import { api, UserSession } from './services/api';

type ViewType =
  | 'dashboard'
  | 'builder'
  | 'analytics'
  | 'surveys'
  | 'admin-overview'
  | 'admin-users'
  | 'admin-surveys'
  | 'admin-audit'
  | 'login'
  | 'respondent';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ message: string; icon?: string; visible: boolean }>({
    message: '',
    icon: 'check_circle',
    visible: false,
  });

  const showToast = (message: string, icon = 'check_circle') => {
    setToast({ message, icon, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3400);
  };

  // Initial check for session
  useEffect(() => {
    async function checkSession() {
      try {
        const user = await api.auth.getMe();
        if (user) {
          setCurrentUser(user);
          if (user.role === 'admin') {
            setCurrentView('admin-overview');
          } else {
            setCurrentView('dashboard');
          }
          await loadUserSurveys();
        } else {
          setCurrentView('login');
        }
      } catch (err) {
        setCurrentView('login');
      } finally {
        setIsInitializing(false);
      }
    }
    checkSession();
  }, []);

  // Fetch isolated surveys for the authenticated user
  const loadUserSurveys = async () => {
    try {
      const userSurveys = await api.surveys.getAll();
      setSurveys(userSurveys);
      if (userSurveys.length > 0 && !activeSurveyId) {
        setActiveSurveyId(userSurveys[0].id);
      }
    } catch (err) {
      console.error('Failed to load surveys:', err);
    }
  };

  const isAdminView =
    currentView === 'admin-overview' ||
    currentView === 'admin-users' ||
    currentView === 'admin-surveys' ||
    currentView === 'admin-audit';

  const handleNavigate = (view: ViewType) => {
    const isTargetAdmin =
      view === 'admin-overview' ||
      view === 'admin-users' ||
      view === 'admin-surveys' ||
      view === 'admin-audit';

    if (isTargetAdmin && currentUser?.role !== 'admin') {
      showToast('Access denied. Administrator privileges required.', 'shield');
      return;
    }
    setCurrentView(view);
  };

  // Logout handler
  const handleLogout = async () => {
    await api.auth.logout();
    setCurrentUser(null);
    setSurveys([]);
    setCurrentView('login');
    showToast('You have been logged out safely.', 'logout');
  };

  // Login handler
  const handleLoginSuccess = async (user: UserSession) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('admin-overview');
    } else {
      setCurrentView('dashboard');
    }
    await loadUserSurveys();
  };

  // Create new survey or load from template
  const handleOpenBuilder = async (surveyId?: string, templateKey?: 'csat' | 'employee' | 'nps' | 'event') => {
    if (templateKey && TEMPLATES[templateKey]) {
      const t = TEMPLATES[templateKey];
      try {
        const newSurvey = await api.surveys.create({
          title: t.title,
          welcomeMessage: t.description,
          anonymousResponses: true,
          showProgressBar: true,
          randomizeOrder: false,
          oneResponsePerUser: true,
          questions: t.questions as any,
        });

        await loadUserSurveys();
        setActiveSurveyId(newSurvey.id);
        setCurrentView('builder');
        showToast(`Loaded ${templateKey.toUpperCase()} template into your private surveys!`, 'rocket_launch');
      } catch (err: any) {
        showToast(err.message || 'Failed to create survey.', 'error');
      }
      return;
    }

    if (surveyId) {
      setActiveSurveyId(surveyId);
      setCurrentView('builder');
    } else {
      // Start from scratch
      try {
        const newSurvey = await api.surveys.create({
          title: 'Untitled Survey',
          welcomeMessage: 'Please take a moment to provide your valuable feedback.',
          anonymousResponses: true,
          showProgressBar: true,
          randomizeOrder: false,
          oneResponsePerUser: true,
          questions: [
            {
              id: `q-${Date.now()}-1`,
              type: 'single',
              title: 'How satisfied are you with our service?',
              required: true,
              options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Unsatisfied'],
            },
          ],
        });
        await loadUserSurveys();
        setActiveSurveyId(newSurvey.id);
        setCurrentView('builder');
        showToast('Created new private survey draft.', 'add_circle');
      } catch (err: any) {
        showToast(err.message || 'Failed to create survey.', 'error');
      }
    }
  };

  const handleUpdateSurvey = async (updated: Survey) => {
    try {
      await api.surveys.update(updated.id, updated);
      await loadUserSurveys();
      showToast('Survey updated and saved to SQLite store.', 'save');
    } catch (err: any) {
      showToast(err.message || 'Failed to save survey.', 'error');
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    try {
      await api.surveys.delete(surveyId);
      await loadUserSurveys();
      showToast('Survey removed from database.', 'delete');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete survey.', 'error');
    }
  };

  const handleOpenAnalytics = (surveyId?: string) => {
    if (surveyId) setActiveSurveyId(surveyId);
    setCurrentView('analytics');
  };

  const handleFinishResponse = async (_surveyId: string) => {
    await loadUserSurveys();
    showToast('Survey submission recorded safely in SQLite store!', 'verified');
  };

  const activeSurvey = surveys.find((s) => s.id === activeSurveyId) || surveys[0] || {
    id: 'sample',
    title: 'Q1 Product Feedback & Feature Prioritization',
    slug: 'pulse-q1-2025',
    status: 'published',
    responsesCount: 0,
    completionRate: 0,
    editedAt: 'Just now',
    welcomeMessage: 'Please take 3 minutes to share your thoughts.',
    anonymousResponses: true,
    showProgressBar: true,
    randomizeOrder: false,
    oneResponsePerUser: true,
    iconName: 'poll',
    questions: [
      {
        id: 'q1',
        type: 'single',
        title: 'How satisfied are you with our current platform speed?',
        required: true,
        options: ['Excellent', 'Good', 'Average', 'Poor'],
      },
    ],
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">
            progress_activity
          </span>
          <span className="text-sm font-semibold text-outline">Loading PulseFeedback...</span>
        </div>
      </div>
    );
  }

  // Public Respondent Mode
  if (currentView === 'respondent') {
    return (
      <>
        <RespondentSurveyView
          survey={activeSurvey}
          onFinishResponse={handleFinishResponse}
          onExit={() => setCurrentView(currentUser ? (currentUser.role === 'admin' ? 'admin-overview' : 'dashboard') : 'login')}
        />
        <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
      </>
    );
  }

  // Unauthenticated / Auth Screen
  if (!currentUser || currentView === 'login') {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <button
            type="button"
            onClick={() => setCurrentView('respondent')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface shadow-md hover:bg-surface-container text-xs font-semibold cursor-pointer border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">send</span>
            <span>Test Public Survey Flow</span>
          </button>
        </div>
        <AuthScreen onLoginSuccess={handleLoginSuccess} onShowToast={showToast} />
        <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isAdminMode={isAdminView}
        currentUserRole={currentUser.role}
        onLogout={handleLogout}
        onTogglePortal={() => {
          if (currentUser.role !== 'admin') {
            showToast('Access denied. Administrator privileges required.', 'shield');
            return;
          }
          setCurrentView(isAdminView ? 'dashboard' : 'admin-overview');
        }}
      />

      {/* Main Content Area */}
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar
          isAdminMode={isAdminView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentUser={currentUser}
          onTogglePortal={() => {
            if (currentUser.role !== 'admin') {
              showToast('Access denied. Administrator privileges required.', 'shield');
              return;
            }
            setCurrentView(isAdminView ? 'dashboard' : 'admin-overview');
          }}
          onNavigateToLogin={handleLogout}
          onNotificationClick={() => showToast('All notifications read. No system alerts pending.')}
        />

        {/* Global Navigation Strip */}
        <div className="mt-16 bg-surface-container-low px-6 py-2 border-b border-outline-variant/30 flex items-center justify-between gap-4 text-xs font-medium text-on-surface-variant overflow-x-auto">
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold text-on-surface uppercase tracking-wider text-[11px]">
              Active Scope:
            </span>
            <div className="inline-flex rounded-lg bg-surface-container-lowest p-0.5 shadow-xs border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  currentView === 'dashboard' || currentView === 'surveys'
                    ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                1. User Dashboard
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('builder')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  currentView === 'builder'
                    ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                2. Survey Builder
              </button>

              {currentUser.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() => setCurrentView('admin-overview')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    isAdminView
                      ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  3. Admin Console
                </button>
              ) : (
                <span
                  className="px-3 py-1 rounded-md text-outline cursor-not-allowed opacity-60"
                  title="Admin console is restricted to administrators"
                >
                  3. Admin Console (Restricted)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono text-outline">
              User: <strong className="text-on-surface">{currentUser.name}</strong> ({currentUser.role})
            </span>
            <button
              type="button"
              onClick={() => setCurrentView('respondent')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed font-semibold hover:bg-tertiary-fixed-dim transition-colors cursor-pointer shadow-xs"
              title="Test public survey respondent submission"
            >
              <span className="material-symbols-outlined text-[15px]">send</span>
              <span>Test Public Survey Flow</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-error hover:underline text-xs font-semibold cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* View Routing */}
        <main className="relative flex-1 bg-background">
          {(currentView === 'dashboard' || currentView === 'surveys') && (
            <DashboardOverview
              userName={currentUser.name}
              surveys={surveys}
              activities={[]}
              onOpenBuilder={handleOpenBuilder}
              onOpenAnalytics={handleOpenAnalytics}
              onDeleteSurvey={handleDeleteSurvey}
              onShowToast={showToast}
            />
          )}

          {currentView === 'builder' && (
            <SurveyBuilder
              survey={activeSurvey}
              onUpdateSurvey={handleUpdateSurvey}
              onBackToDashboard={() => setCurrentView('dashboard')}
              onShowToast={showToast}
            />
          )}

          {isAdminView && currentUser.role === 'admin' && (
            <AdminConsole
              currentUser={currentUser}
              onShowToast={showToast}
              onNavigateToUserPortal={() => setCurrentView('dashboard')}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView
              survey={activeSurvey}
              onBack={() => setCurrentView('dashboard')}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Global Toast Feedback */}
      <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />
    </div>
  );
}
