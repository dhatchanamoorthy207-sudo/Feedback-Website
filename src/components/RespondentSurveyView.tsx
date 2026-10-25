import React, { useState } from 'react';
import { Survey } from '../types/survey';
import { api } from '../services/api';

interface RespondentSurveyViewProps {
  survey: Survey;
  onFinishResponse: (surveyId: string) => void;
  onExit: () => void;
}

export const RespondentSurveyView: React.FC<RespondentSurveyViewProps> = ({
  survey,
  onFinishResponse,
  onExit,
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  // Compute progress
  const answeredCount = Object.keys(answers).length;
  const totalRequired = survey.questions.filter((q) => q.required).length || 1;
  const progressPercent = Math.min(100, Math.round((answeredCount / totalRequired) * 100));

  const handleSelectRadio = (qId: string, val: string) => {
    setAnswers({ ...answers, [qId]: val });
  };

  const handleToggleCheckbox = (qId: string, val: string) => {
    const existing: string[] = answers[qId] || [];
    if (existing.includes(val)) {
      setAnswers({ ...answers, [qId]: existing.filter((item) => item !== val) });
    } else {
      setAnswers({ ...answers, [qId]: [...existing, val] });
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (survey.slug) {
        await api.publicSurveys.submit(survey.slug, answers);
      }
      setSubmitted(true);
      onFinishResponse(survey.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-surface-container-lowest max-w-lg w-full p-8 rounded-2xl shadow-xl text-center border border-outline-variant/30 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h2 className="font-headline-lg text-2xl font-bold text-on-surface mb-2">
            Thank you for your feedback!
          </h2>
          <p className="font-body-md text-on-surface-variant mb-6 text-sm">
            Your responses have been recorded securely in the ACID-compliant SQLite dataset and will directly influence our sprint prioritization.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="px-6 py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md font-semibold cursor-pointer hover:bg-primary shadow-sm"
            >
              Back to PulseFeedback
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      {/* Top Floating Header for Respondents */}
      <div className="max-w-[720px] mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[16px]">stacked_line_chart</span>
          </div>
          <span className="font-headline-sm font-bold text-primary">PulseFeedback</span>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="text-xs font-semibold text-outline hover:text-on-surface flex items-center gap-1 cursor-pointer bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-outline-variant/30"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Console</span>
        </button>
      </div>

      <div className="max-w-[720px] mx-auto bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden">
        {/* Progress bar docked at the top */}
        {survey.showProgressBar && (
          <div className="w-full bg-surface-container-low h-1.5">
            <div
              className="bg-primary-container h-full transition-all duration-300"
              style={{ width: `${Math.max(10, progressPercent)}%` }}
            ></div>
          </div>
        )}

        <div className="p-8 sm:p-10">
          {/* Survey title & welcome instructions */}
          <div className="border-b border-outline-variant/20 pb-6 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-label-sm uppercase tracking-wider text-primary font-bold">
                Official Survey
              </span>
              {survey.anonymousResponses && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-[11px] text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-[13px] text-secondary">shield_person</span>
                  Anonymous Submission
                </span>
              )}
            </div>

            <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-on-surface mb-3">
              {survey.title}
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              {survey.welcomeMessage}
            </p>
          </div>

          {/* Questions Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {survey.questions.map((q, idx) => {
              const qNum = idx + 1;
              return (
                <div key={q.id} className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-primary font-mono text-sm">{qNum}.</span>
                    <h3 className="font-headline-sm text-base sm:text-lg font-semibold text-on-surface">
                      {q.title}
                      {q.required && <span className="text-error font-bold ml-1">*</span>}
                    </h3>
                  </div>

                  {/* Single Choice Radio */}
                  {q.type === 'single' && (
                    <div className="space-y-2 pt-1">
                      {(q.options || []).map((opt, oIdx) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <label
                            key={oIdx}
                            onClick={() => handleSelectRadio(q.id, opt)}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary-fixed/20 border-primary text-on-surface shadow-xs'
                                : 'bg-surface-container-lowest border-outline-variant/40 hover:bg-surface-container-low text-on-surface'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={isSelected}
                              onChange={() => handleSelectRadio(q.id, opt)}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                            <span className="text-sm font-medium">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* 1-5 Rating Scale */}
                  {q.type === 'rating' && (
                    <div className="pt-2">
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((num) => {
                          const isSelected = answers[q.id] === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setAnswers({ ...answers, [q.id]: num })}
                              className={`py-3 rounded-xl flex flex-col items-center justify-center font-bold text-lg transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-primary-container text-on-primary border-primary shadow-sm'
                                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container border-transparent'
                              }`}
                            >
                              <span>{num}</span>
                              <span
                                className={`material-symbols-outlined text-[16px] ${
                                  isSelected ? 'text-on-primary' : 'text-outline'
                                }`}
                                style={isSelected ? { fontVariationSettings: "'FILL' 1" } : {}}
                              >
                                star
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center text-xs text-outline font-medium px-1 mt-2">
                        <span>{q.minLabel || 'Very Difficult'}</span>
                        <span>Neutral</span>
                        <span>{q.maxLabel || 'Extremely Easy'}</span>
                      </div>
                    </div>
                  )}

                  {/* Multiple Choice Checkboxes */}
                  {q.type === 'multi' && (
                    <div className="space-y-2 pt-1">
                      {(q.options || []).map((opt, oIdx) => {
                        const selectedList: string[] = answers[q.id] || [];
                        const isSelected = selectedList.includes(opt);
                        return (
                          <label
                            key={oIdx}
                            onClick={() => handleToggleCheckbox(q.id, opt)}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary-fixed/20 border-primary text-on-surface shadow-xs'
                                : 'bg-surface-container-lowest border-outline-variant/40 hover:bg-surface-container-low text-on-surface'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCheckbox(q.id, opt)}
                              className="w-4 h-4 accent-primary rounded cursor-pointer"
                            />
                            <span className="text-sm font-medium">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Dropdown Selection */}
                  {q.type === 'dropdown' && (
                    <select
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      className="w-full p-3 bg-surface-container-low rounded-xl text-sm text-on-surface outline-none border border-outline-variant/40 focus:border-primary cursor-pointer"
                    >
                      <option value="">-- Choose an option --</option>
                      {(q.options || []).map((opt, oIdx) => (
                        <option key={oIdx} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Yes / No Toggle */}
                  {q.type === 'yesno' && (
                    <div className="flex gap-4 max-w-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: 'Yes' })}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                          answers[q.id] === 'Yes'
                            ? 'bg-primary-container text-on-primary border-primary shadow-sm'
                            : 'bg-surface-container-low text-on-surface border-transparent hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">thumb_up</span>
                        <span>Yes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: 'No' })}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                          answers[q.id] === 'No'
                            ? 'bg-primary-container text-on-primary border-primary shadow-sm'
                            : 'bg-surface-container-low text-on-surface border-transparent hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">thumb_down</span>
                        <span>No</span>
                      </button>
                    </div>
                  )}

                  {/* Open-Ended Text */}
                  {q.type === 'text' && (
                    <div>
                      <textarea
                        rows={4}
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        placeholder="Write your constructive thoughts here..."
                        maxLength={q.characterLimit || 500}
                        className="w-full p-3.5 bg-surface-container-low text-on-surface font-body-sm text-sm rounded-xl outline-none border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest transition-colors"
                      />
                      <div className="flex justify-end text-xs text-outline mt-1 font-mono">
                        {(answers[q.id] || '').length} / {q.characterLimit || 500} characters
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {errorMessage && (
              <div className="p-3 bg-error-container/40 text-error rounded-lg text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-6 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-xs text-outline">
                {answeredCount} of {survey.questions.length} questions answered
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-base font-semibold transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Survey'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
