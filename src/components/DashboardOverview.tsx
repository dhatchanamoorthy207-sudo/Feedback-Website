import React, { useState } from 'react';
import { Survey, ActivityStreamItem } from '../types/survey';

interface DashboardOverviewProps {
  userName: string;
  surveys: Survey[];
  activities: ActivityStreamItem[];
  onOpenBuilder: (surveyId?: string, templateKey?: 'csat' | 'employee' | 'nps' | 'event') => void;
  onOpenAnalytics: (surveyId?: string) => void;
  onDeleteSurvey: (surveyId: string) => void;
  onShowToast: (message: string, icon?: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  userName,
  surveys,
  activities,
  onOpenBuilder,
  onOpenAnalytics,
  onDeleteSurvey,
  onShowToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Compute dynamic stats from actual database records
  const totalCount = surveys.length;
  const publishedCount = surveys.filter((s) => s.status === 'published').length;
  const draftCount = surveys.filter((s) => s.status === 'draft').length;
  const closedCount = surveys.filter((s) => s.status === 'closed').length;

  const totalResponses = surveys.reduce((acc, s) => acc + (s.responsesCount || 0), 0);

  const surveysWithResponses = surveys.filter((s) => s.responsesCount > 0);
  const avgCompletionRate =
    surveysWithResponses.length > 0
      ? (
          surveysWithResponses.reduce((acc, s) => acc + (s.completionRate || 0), 0) /
          surveysWithResponses.length
        ).toFixed(1)
      : '0.0';

  // Filter surveys
  const filteredSurveys = surveys.filter((s) => {
    const matchesFilter = activeFilter === 'all' ? true : s.status === activeFilter;
    const matchesQuery = filterQuery === '' || s.title.toLowerCase().includes(filterQuery.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const handleCopyLink = (survey: Survey, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/s/${survey.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(survey.id);
        onShowToast(`Survey link copied: /s/${survey.slug}`, 'link');
        setTimeout(() => setCopiedId(null), 2000);
      }).catch(() => {
        onShowToast(`Survey link: /s/${survey.slug}`, 'link');
      });
    } else {
      onShowToast(`Survey link: /s/${survey.slug}`, 'link');
    }
  };

  const handleQuickExport = () => {
    if (surveys.length === 0) {
      onShowToast('No surveys or responses available to export yet.', 'info');
      return;
    }

    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      const headers = 'Survey ID,Survey Title,Status,Responses,Completion Rate,Edited At\n';
      const rows = surveys
        .map((s) => `"${s.id}","${s.title}","${s.status}",${s.responsesCount},"${s.completionRate}%","${s.editedAt}"`)
        .join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pulsefeedback_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('CSV telemetry dataset downloaded successfully.', 'download_done');
    }, 500);
  };

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-7xl mx-auto w-full">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <h1 className="font-headline-xl text-headline-xl text-on-surface">Welcome back, {userName} 👋</h1>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Here is your live telemetry for active surveys and response rates.
          </p>
        </div>

        <div className="flex items-center gap-space-sm self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleQuickExport}
            disabled={isExporting}
            className="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors shadow-sm font-label-md text-label-md cursor-pointer disabled:opacity-60 border border-outline-variant/30"
          >
            <span className={`material-symbols-outlined text-[18px] ${isExporting ? 'animate-spin' : ''}`}>
              {isExporting ? 'refresh' : 'download'}
            </span>
            <span>{isExporting ? 'Exporting...' : 'Quick Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenBuilder()}
            className="inline-flex items-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-all duration-150 shadow-sm hover:shadow-md font-label-md text-label-md cursor-pointer font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ Create New Survey</span>
          </button>
        </div>
      </div>

      {/* 4 Key Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Total Surveys */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Total Surveys
            </span>
            <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[20px]">assignment</span>
            </div>
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold">{totalCount}</span>
            <div className="inline-flex items-center gap-0.5 px-space-xs py-0.5 rounded-full bg-surface-container-low text-primary-container font-label-sm text-label-sm font-semibold">
              <span>{publishedCount} live</span>
            </div>
          </div>
        </div>

        {/* Active / Published */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Active / Published
            </span>
            <div className="w-9 h-9 rounded-lg bg-tertiary-fixed/30 flex items-center justify-center text-tertiary-container">
              <span className="material-symbols-outlined text-[20px]">sensors</span>
            </div>
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold">{publishedCount}</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>
              {publishedCount} Active
            </div>
          </div>
        </div>

        {/* Total Responses */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Total Responses
            </span>
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
            </div>
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold font-mono">
              {totalResponses.toLocaleString()}
            </span>
            <div className="inline-flex items-center gap-0.5 px-space-xs py-0.5 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm font-semibold">
              <span>Verified Data</span>
            </div>
          </div>
        </div>

        {/* Avg Completion Rate */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Avg Completion Rate
            </span>
            <div className="w-9 h-9 rounded-lg bg-secondary-fixed/40 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[20px]">donut_large</span>
            </div>
          </div>
          <div className="mt-space-md flex items-baseline justify-between">
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold font-mono">
              {avgCompletionRate}%
            </span>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              {totalResponses > 0 ? 'Live Funnel' : 'No Data'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Split: 8 cols left, 4 cols right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          {/* Recent Surveys Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col border border-outline-variant/30">
            {/* Header and Filter Input */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pb-space-md">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  Surveys &amp; Performance
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Manage distribution links, question logic, and response datasets.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  filter_list
                </span>
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter surveys..."
                  className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low text-on-surface placeholder:text-outline rounded-lg font-body-sm text-body-sm focus:outline-none focus:bg-surface-container transition-colors border border-outline-variant/30"
                />
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-space-xs p-1 bg-surface-container-low rounded-lg self-start mb-space-md">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-space-md py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('published')}
                className={`px-space-md py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                  activeFilter === 'published'
                    ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Published ({publishedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('draft')}
                className={`px-space-md py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                  activeFilter === 'draft'
                    ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Draft ({draftCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('closed')}
                className={`px-space-md py-1 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                  activeFilter === 'closed'
                    ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Closed ({closedCount})
              </button>
            </div>

            {/* Survey Items List */}
            <div className="flex flex-col gap-space-sm">
              {filteredSurveys.map((survey) => (
                <div
                  key={survey.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-space-md bg-surface-container-lowest rounded-lg hover:bg-surface-container-low transition-all duration-150 shadow-sm hover:shadow border border-outline-variant/30"
                >
                  <div className="flex items-start gap-space-md min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary-container shrink-0 mt-0.5 sm:mt-0">
                      <span className="material-symbols-outlined text-[20px]">poll</span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-sm flex-wrap">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                          {survey.title}
                        </span>
                        {survey.status === 'published' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-on-tertiary-fixed bg-tertiary-fixed font-label-sm text-label-sm font-semibold">
                            Published
                          </span>
                        ) : survey.status === 'draft' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-on-surface-variant bg-surface-container-high font-label-sm text-label-sm font-semibold">
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-on-surface-variant bg-surface-container font-label-sm text-label-sm font-semibold">
                            Closed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-space-md mt-1 font-body-sm text-body-sm text-on-surface-variant flex-wrap">
                        {survey.status === 'published' ? (
                          <>
                            <span className="flex items-center gap-1 font-semibold text-on-surface">
                              <span className="material-symbols-outlined text-[16px] text-secondary">forum</span>
                              {survey.responsesCount.toLocaleString()} responses
                            </span>
                            <span className="text-outline">•</span>
                            <span>{survey.questions?.length || 0} questions</span>
                          </>
                        ) : (
                          <span>0 responses (Draft mode)</span>
                        )}
                        <span className="text-outline">•</span>
                        <span className="text-outline">{survey.editedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-xs mt-space-md sm:mt-0 self-end sm:self-auto relative">
                    {survey.status === 'published' && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(survey, e)}
                          title="Copy shareable link"
                          className="relative p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">link</span>
                          {copiedId === survey.id && (
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-inverse-surface text-inverse-on-surface font-label-sm text-label-sm shadow-md whitespace-nowrap z-30">
                              Link Copied!
                            </span>
                          )}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenAnalytics(survey.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary-container">query_stats</span>
                      <span>Analytics</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenBuilder(survey.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Edit</span>
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === survey.id ? null : survey.id)}
                        className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>

                      {activeMenuId === survey.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-44 bg-surface-container-lowest rounded-lg shadow-xl border border-outline-variant/30 py-1 z-30 font-label-md text-xs"
                          onClick={() => setActiveMenuId(null)}
                        >
                          <button
                            type="button"
                            onClick={() => onDeleteSurvey(survey.id)}
                            className="w-full text-left px-3 py-1.5 hover:bg-error-container/20 text-error flex items-center gap-2 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            <span>Delete Survey</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Clean Empty State when no surveys exist */}
              {filteredSurveys.length === 0 && (
                <div className="py-12 px-6 text-center bg-surface-container-low/60 rounded-xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-outline mb-3">
                    <span className="material-symbols-outlined text-2xl">post_add</span>
                  </div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
                    {surveys.length === 0 ? 'No Surveys Created Yet' : 'No Surveys Found'}
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant max-w-sm mb-4 leading-relaxed">
                    {surveys.length === 0
                      ? 'Your workspace is ready. Build a custom survey from scratch or launch one from the proven templates on the right.'
                      : 'No surveys match your current filter query. Try selecting another tab or clearing search.'}
                  </p>
                  {surveys.length === 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenBuilder()}
                      className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-xs font-semibold cursor-pointer shadow-sm hover:bg-primary"
                    >
                      + Create Your First Survey
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Summary Footer */}
            {filteredSurveys.length > 0 && (
              <div className="mt-space-md pt-space-sm flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                <span>
                  Showing {filteredSurveys.length} of {totalCount} surveys
                </span>
                <span className="font-label-md text-label-md text-primary">All surveys synced with database</span>
              </div>
            )}
          </div>

          {/* Response Telemetry Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col border border-outline-variant/30">
            <div className="flex items-center justify-between mb-space-sm">
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Aggregated Telemetry
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Response Stream Velocity
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary bg-surface-container-low px-2 py-1 rounded-md font-semibold">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span> Persistent DB
                </span>
              </div>
            </div>

            {totalResponses > 0 ? (
              <div className="w-full pt-2">
                <div className="p-4 bg-surface-container-low rounded-lg text-sm flex items-center justify-between">
                  <div>
                    <span className="font-bold text-lg text-primary font-mono">{totalResponses}</span>
                    <span className="text-xs text-outline block">Total Verified Responses Ingested</span>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-secondary">analytics</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-outline bg-surface-container-low/50 rounded-lg text-xs mt-2">
                <p>No response velocity recorded yet.</p>
                <p className="mt-1 text-on-surface-variant">Publish a survey and distribute the link to collect responses.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          {/* Quick Survey Builder Launchpad */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col border border-outline-variant/30">
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="material-symbols-outlined text-primary-container text-[20px]">rocket_launch</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Quick Builder Launchpad
              </h3>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              Deploy tested templates or start with custom branching logic.
            </p>

            <div className="grid grid-cols-2 gap-space-sm mb-space-md">
              <button
                type="button"
                onClick={() => onOpenBuilder(undefined, 'csat')}
                className="flex flex-col p-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-all group text-left cursor-pointer border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-[20px] text-primary-container group-hover:scale-110 transition-transform">
                  mood
                </span>
                <span className="font-label-md text-label-md text-on-surface font-semibold mt-1">CSAT</span>
                <span className="font-label-sm text-label-sm text-outline">4 Questions</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenBuilder(undefined, 'employee')}
                className="flex flex-col p-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-all group text-left cursor-pointer border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-[20px] text-secondary group-hover:scale-110 transition-transform">
                  psychology
                </span>
                <span className="font-label-md text-label-md text-on-surface font-semibold mt-1">Employee Pulse</span>
                <span className="font-label-sm text-label-sm text-outline">4 Questions</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenBuilder(undefined, 'nps')}
                className="flex flex-col p-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-all group text-left cursor-pointer border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-[20px] text-tertiary-container group-hover:scale-110 transition-transform">
                  star_rate
                </span>
                <span className="font-label-md text-label-md text-on-surface font-semibold mt-1">NPS Metric</span>
                <span className="font-label-sm text-label-sm text-outline">Standard 1-5</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenBuilder(undefined, 'event')}
                className="flex flex-col p-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface transition-all group text-left cursor-pointer border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-[20px] text-outline group-hover:scale-110 transition-transform">
                  event_available
                </span>
                <span className="font-label-md text-label-md text-on-surface font-semibold mt-1">Event Feedback</span>
                <span className="font-label-sm text-label-sm text-outline">4 Questions</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenBuilder()}
              className="w-full py-2.5 px-space-md rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-semibold text-center flex items-center justify-center gap-space-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle_outline</span>
              <span>Start from Scratch</span>
            </button>
          </div>

          {/* Database & Session Status Card */}
          <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
                <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface">
                  Store Engine Connected
                </span>
              </div>
              <span className="font-code-sm text-code-sm text-outline">SQLite ACID</span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Persistent database storage with foreign key constraints and automated transaction rollbacks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
