import React, { useEffect, useState } from 'react';
import { Survey } from '../types/survey';
import { api } from '../services/api';

interface AnalyticsViewProps {
  survey: Survey;
  onBack: () => void;
  onShowToast: (message: string, icon?: string) => void;
}

interface QuestionAnalytics {
  id: string;
  title: string;
  type: string;
  options: string[];
  totalAnswers: number;
  distribution: { label: string; count: number; percentage: number }[];
  avgRating: string | null;
  textSamples: string[];
}

interface AnalyticsData {
  survey: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
  totalResponses: number;
  completedResponses: number;
  completionRate: number;
  questions: QuestionAnalytics[];
  recentResponses: {
    id: string;
    respondentId: string;
    status: string;
    submittedAt: string;
    timeSpentSeconds: number;
  }[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  survey,
  onBack,
  onShowToast,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.surveys.getAnalytics(survey.id);
        if (mounted) {
          setData(result);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load survey analytics.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();
    return () => {
      mounted = false;
    };
  }, [survey.id]);

  const handleExportCSV = () => {
    if (!data || data.totalResponses === 0) {
      onShowToast('No responses collected yet to export.', 'info');
      return;
    }

    const headers = 'Response ID,Respondent ID,Status,Submitted At,Duration (Seconds)\n';
    const rows = data.recentResponses
      .map(
        (r) =>
          `"${r.id}","${r.respondentId}","${r.status}","${r.submittedAt}",${r.timeSpentSeconds || 0}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey_${data.survey.slug}_responses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Exported survey response dataset to CSV.', 'download_done');
  };

  if (loading) {
    return (
      <div className="px-space-xl py-space-lg flex flex-col items-center justify-center min-h-[400px]">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-3">
          progress_activity
        </span>
        <span className="text-sm font-semibold text-outline">Loading verified response data...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-space-xl py-space-lg max-w-7xl mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer mb-4"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Surveys</span>
        </button>
        <div className="p-8 bg-error-container/20 border border-error/30 rounded-xl text-center">
          <p className="text-sm font-semibold text-error mb-2">{error || 'Unable to load survey data.'}</p>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-surface-container rounded-lg text-xs font-semibold text-on-surface"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalResponses = data.totalResponses;
  const completionRate = data.completionRate;

  return (
    <div className="px-space-xl py-space-lg flex flex-col gap-space-lg max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Surveys</span>
            </button>
            <span className="text-outline">•</span>
            <span className="font-label-sm text-xs bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full font-semibold">
              Live Verified Telemetry
            </span>
            <span className="text-outline">•</span>
            <span className="font-mono text-xs text-outline">{survey.slug}</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold">
            {survey.title}
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant">
            Telemetry metrics, response distribution funnels, and real participant answer records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-sm font-label-md cursor-pointer transition-colors shadow-sm border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards based on real data */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30">
          <span className="text-xs font-semibold uppercase text-outline">Total Responses</span>
          <p className="text-3xl font-bold text-on-surface mt-2 font-mono">
            {totalResponses.toLocaleString()}
          </p>
          <span className="text-xs text-secondary font-medium mt-1 inline-block">
            {totalResponses > 0 ? 'Verified Ingested Records' : 'Awaiting First Participant'}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30">
          <span className="text-xs font-semibold uppercase text-outline">Completion Rate</span>
          <p className="text-3xl font-bold text-on-surface mt-2 font-mono">{completionRate}%</p>
          <span className="text-xs text-tertiary-container font-medium mt-1 inline-block">
            {totalResponses > 0 ? `${data.completedResponses} completed` : 'No data recorded yet'}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/30">
          <span className="text-xs font-semibold uppercase text-outline">Survey Status</span>
          <p className="text-3xl font-bold text-primary mt-2 capitalize font-mono">{survey.status}</p>
          <span className="text-xs text-outline mt-1 inline-block">
            {survey.status === 'published' ? 'Accepting Live Responses' : 'Draft Mode (Unpublished)'}
          </span>
        </div>
      </div>

      {/* Breakdown per Question */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-lg text-xl font-bold text-on-surface">Question-Level Breakdown</h2>
          <span className="text-xs font-mono text-outline">
            {data.questions.length} Question{data.questions.length === 1 ? '' : 's'} Configured
          </span>
        </div>

        {totalResponses === 0 ? (
          <div className="py-12 px-6 text-center bg-surface-container-low/50 rounded-xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-outline mb-3">
              <span className="material-symbols-outlined text-2xl">query_stats</span>
            </div>
            <h3 className="font-headline-sm text-base font-bold text-on-surface mb-1">
              No Responses Collected Yet
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant max-w-sm mb-4 leading-relaxed">
              When participants submit their answers through your survey link, live distribution charts, rating averages, and response transcripts will appear here automatically.
            </p>
            <div className="inline-flex items-center gap-2 p-2 bg-surface-container rounded-lg text-xs font-mono text-on-surface">
              <span>{window.location.origin}/s/{survey.slug}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {data.questions.map((q, idx) => (
              <div key={q.id} className="p-5 bg-surface-container-low rounded-xl space-y-3 border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary uppercase">
                    Question {idx + 1} • {q.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-outline font-semibold">
                    {q.totalAnswers} response{q.totalAnswers === 1 ? '' : 's'}
                    {q.avgRating ? ` • Avg: ${q.avgRating} ★` : ''}
                  </span>
                </div>
                <h3 className="font-headline-sm text-base font-semibold text-on-surface">{q.title}</h3>

                {/* Option Distribution Bars */}
                {q.distribution && q.distribution.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {q.distribution.map((dist, dIdx) => (
                      <div key={dIdx} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-on-surface">
                          <span>{dist.label}</span>
                          <span className="font-mono text-outline">
                            {dist.count} ({dist.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary-container h-full rounded-full transition-all duration-500"
                            style={{ width: `${dist.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Text responses list */}
                {q.type === 'text' && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs text-outline font-semibold uppercase">Participant Submissions</span>
                    {q.textSamples.length === 0 ? (
                      <p className="text-xs text-outline italic">No text submitted for this question.</p>
                    ) : (
                      <div className="space-y-2">
                        {q.textSamples.map((text, tIdx) => (
                          <div
                            key={tIdx}
                            className="p-3 bg-surface-container-lowest rounded-lg text-xs text-on-surface shadow-xs border border-outline-variant/20"
                          >
                            "{text}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Responses Log */}
      {data.recentResponses.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-4">
          <h2 className="font-headline-lg text-lg font-bold text-on-surface">Recent Participant Submissions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body-sm">
              <thead className="bg-surface-container-low text-on-surface-variant font-semibold uppercase text-[11px] border-b border-outline-variant/30">
                <tr>
                  <th className="p-3">Response ID</th>
                  <th className="p-3">Respondent Token</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-mono">
                {data.recentResponses.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low/50">
                    <td className="p-3 text-primary">{r.id}</td>
                    <td className="p-3 text-outline">{r.respondentId || 'Anonymous'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-tertiary-fixed text-on-tertiary-fixed">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-on-surface-variant">
                      {new Date(r.submittedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
