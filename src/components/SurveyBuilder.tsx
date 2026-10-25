import React, { useState, useEffect } from 'react';
import { Survey, Question, QuestionType } from '../types/survey';

interface SurveyBuilderProps {
  survey: Survey;
  onUpdateSurvey: (updated: Survey) => void;
  onBackToDashboard: () => void;
  onShowToast: (message: string, icon?: string) => void;
}

export const SurveyBuilder: React.FC<SurveyBuilderProps> = ({
  survey,
  onUpdateSurvey,
  onBackToDashboard,
  onShowToast,
}) => {
  const [currentSurvey, setCurrentSurvey] = useState<Survey>(survey);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    setCurrentSurvey(survey);
  }, [survey.id]);

  const handleTitleChange = (val: string) => {
    setCurrentSurvey((prev) => ({ ...prev, title: val }));
  };

  const handleWelcomeChange = (val: string) => {
    setCurrentSurvey((prev) => ({ ...prev, welcomeMessage: val }));
  };

  const handleAnonymousToggle = () => {
    setCurrentSurvey((prev) => ({ ...prev, anonymousResponses: !prev.anonymousResponses }));
    onShowToast(`Anonymous response collection ${!currentSurvey.anonymousResponses ? 'enabled' : 'disabled'}`);
  };

  const handleSettingToggle = (key: 'showProgressBar' | 'randomizeOrder' | 'oneResponsePerUser') => {
    const newVal = !currentSurvey[key];
    setCurrentSurvey((prev) => ({ ...prev, [key]: newVal }));
    onShowToast(`Updated setting: ${key} = ${newVal}`);
  };

  const handleSaveDraft = () => {
    onUpdateSurvey(currentSurvey);
    onShowToast('Survey changes saved to local SQLite store.', 'save');
  };

  const handlePublish = () => {
    const updated = { ...currentSurvey, status: 'published' as const };
    setCurrentSurvey(updated);
    onUpdateSurvey(updated);
    onShowToast('Survey successfully published! Active link live on edge CDN.', 'rocket_launch');
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/s/${currentSurvey.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        onShowToast(`Survey link copied: /s/${currentSurvey.slug}`, 'content_copy');
      }).catch(() => {
        onShowToast(`Survey URL ready: /s/${currentSurvey.slug}`, 'link');
      });
    } else {
      onShowToast(`Survey URL ready: /s/${currentSurvey.slug}`, 'link');
    }
  };

  // Question editing
  const updateQuestionPrompt = (qId: string, title: string) => {
    setCurrentSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === qId ? { ...q, title } : q)),
    }));
  };

  const updateQuestionRequired = (qId: string, required: boolean) => {
    setCurrentSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === qId ? { ...q, required } : q)),
    }));
  };

  const updateQuestionType = (qId: string, newType: QuestionType) => {
    setCurrentSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id !== qId) return q;
        let options = q.options;
        if ((newType === 'single' || newType === 'multi' || newType === 'dropdown') && (!options || options.length === 0)) {
          options = ['Option 1', 'Option 2', 'Option 3'];
        }
        return {
          ...q,
          type: newType,
          options,
        };
      }),
    }));
    onShowToast(`Question typology changed to ${newType}`);
  };

  const deleteQuestion = (qId: string) => {
    setCurrentSurvey((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== qId),
    }));
    onShowToast('Question node removed from survey.', 'delete');
  };

  const addOption = (qId: string) => {
    setCurrentSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id !== qId) return q;
        const currentOpts = q.options || [];
        return {
          ...q,
          options: [...currentOpts, `New Option ${currentOpts.length + 1}`],
        };
      }),
    }));
  };

  const updateOptionText = (qId: string, optIndex: number, text: string) => {
    setCurrentSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id !== qId) return q;
        const newOpts = [...(q.options || [])];
        newOpts[optIndex] = text;
        return { ...q, options: newOpts };
      }),
    }));
  };

  const removeOption = (qId: string, optIndex: number) => {
    setCurrentSurvey((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id !== qId) return q;
        const newOpts = (q.options || []).filter((_, idx) => idx !== optIndex);
        return { ...q, options: newOpts };
      }),
    }));
  };

  // Add new question node
  const addNewQuestion = (type: QuestionType) => {
    const newIndex = currentSurvey.questions.length + 1;
    const newId = `card-q${Date.now()}`;
    let title = '';
    let options: string[] | undefined;
    let minRating: number | undefined;
    let maxRating: number | undefined;

    switch (type) {
      case 'single':
        title = 'How satisfied are you with our service?';
        options = ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'];
        break;
      case 'multi':
        title = 'Which capabilities are most essential for your team?';
        options = ['Data exports', 'API access', 'Audit logs', 'Single Sign-On'];
        break;
      case 'rating':
        title = 'How would you rate the overall experience?';
        minRating = 1;
        maxRating = 5;
        break;
      case 'dropdown':
        title = 'What is your primary role or department?';
        options = ['Engineering', 'Product & Design', 'Operations', 'Leadership'];
        break;
      case 'yesno':
        title = 'Would you recommend this workflow to others?';
        break;
      case 'text':
        title = 'What is one specific improvement you would recommend?';
        break;
    }

    const newQ: Question = {
      id: newId,
      type,
      title,
      required: true,
      options,
      minRating,
      maxRating,
      characterLimit: 500,
    };

    setCurrentSurvey((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ],
    }));

    onShowToast(`Added Question ${newIndex} (${type.toUpperCase()})`, 'add_circle');

    // Smooth scroll to the new card
    setTimeout(() => {
      const el = document.getElementById(newId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const scrollToQuestion = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary-container');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary-container'), 1200);
    }
  };

  // Preview submission
  const handlePreviewSubmit = () => {
    onShowToast('Preview test submission recorded safely in sandbox mode.', 'verified');
    setPreviewOpen(false);
  };

  return (
    <div className="flex flex-col w-full min-h-screen pb-16">
      {/* Top Action & Meta Bar */}
      <div className="w-full bg-surface-container-lowest px-margin py-space-md shadow-sm border-b border-outline-variant/20 sticky top-16 z-30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md max-w-7xl mx-auto">
          {/* Left side: Breadcrumb, Inline Editable Title, Badge */}
          <div className="flex flex-col gap-space-xs min-w-0">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline">
              <button
                type="button"
                onClick={onBackToDashboard}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Surveys
              </button>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-on-surface-variant font-medium">
                {currentSurvey.status === 'published' ? 'Live Survey' : 'New Survey (Draft)'}
              </span>
            </div>

            <div className="flex items-center gap-space-sm flex-wrap">
              <input
                type="text"
                value={currentSurvey.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                title="Click to rename survey"
                className="font-headline-lg text-headline-lg text-on-surface font-bold bg-transparent hover:bg-surface-container-low focus:bg-surface-container-low px-space-xs py-0.5 rounded-lg transition-colors outline-none max-w-xl truncate cursor-text"
              />
              <div className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentSurvey.status === 'published' ? 'bg-tertiary-container' : 'bg-secondary'
                  }`}
                ></span>
                <span>
                  {currentSurvey.status === 'published' ? 'Published' : 'Draft'} • Auto-saved 1m ago
                </span>
              </div>
            </div>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-space-sm flex-wrap self-start lg:self-auto">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy direct survey link"
              className="inline-flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant text-label-sm font-label-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">link</span>
              <span className="font-code-sm text-code-sm">/s/{currentSurvey.slug}</span>
              <span className="material-symbols-outlined text-[16px] text-outline">content_copy</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={handlePublish}
              className="inline-flex items-center gap-space-xs px-space-lg py-1.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md transition-colors shadow-sm cursor-pointer font-semibold"
            >
              <span>Publish Survey</span>
              <span className="text-[14px]">🚀</span>
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Two-Column Container */}
      <div className="px-margin py-space-lg max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* LEFT / MAIN CANVAS: Question Builder Workspace (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg min-w-0">
            {/* Survey Header & Welcome Settings Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container"></div>
              <div className="flex items-center justify-between pb-space-md mb-space-md bg-surface-container-low/60 -mx-space-xl -mt-space-xl px-space-xl pt-space-md">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">tune</span>
                  <span className="font-label-md text-label-md text-primary-container uppercase tracking-wider font-semibold">
                    Survey Introduction Block
                  </span>
                </div>
                <span className="font-code-sm text-code-sm text-outline">Section 01 of 01</span>
              </div>

              <div className="space-y-space-md">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-space-xs font-semibold">
                    Public Survey Title
                  </label>
                  <input
                    type="text"
                    value={currentSurvey.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-space-md py-2 bg-surface-container-low text-on-surface font-headline-sm text-headline-sm rounded-lg outline-none focus:bg-surface-container-lowest border border-transparent focus:border-outline-variant/40 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-space-xs font-semibold">
                    Respondent Welcome &amp; Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={currentSurvey.welcomeMessage}
                    onChange={(e) => handleWelcomeChange(e.target.value)}
                    className="w-full px-space-md py-2 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-lg outline-none focus:bg-surface-container-lowest border border-transparent focus:border-outline-variant/40 transition-all leading-relaxed"
                  />
                </div>

                {/* Anonymous Collection Toggle */}
                <div className="pt-space-xs flex items-center justify-between bg-surface-container-low p-space-md rounded-lg">
                  <div className="flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">shield_person</span>
                    <div>
                      <h4 className="font-label-md text-label-md text-on-surface font-semibold">
                        Collect Anonymous Responses
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Do not log respondent IP addresses, company tenant headers, or email addresses.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSurvey.anonymousResponses}
                      onChange={handleAnonymousToggle}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Dynamic Questions Stack */}
            <div className="flex flex-col gap-space-md" id="questions-list">
              {currentSurvey.questions.map((q, idx) => {
                const qNumber = idx + 1;
                return (
                  <div
                    key={q.id}
                    id={q.id}
                    className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm transition-all hover:shadow-md"
                  >
                    {/* Header bar of question card */}
                    <div className="flex items-center justify-between gap-space-md pb-space-sm mb-space-sm bg-surface-container-low/40 -mx-space-lg -mt-space-lg px-space-lg pt-space-sm">
                      <div className="flex items-center gap-space-xs">
                        <span
                          className="material-symbols-outlined text-outline cursor-grab active:cursor-grabbing text-[20px]"
                          title="Drag to reorder"
                        >
                          drag_indicator
                        </span>
                        <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold">
                          {qNumber}
                        </span>
                        <span className="font-label-sm text-label-sm uppercase tracking-wide text-outline font-semibold">
                          {q.type === 'single'
                            ? 'Single Choice'
                            : q.type === 'rating'
                            ? 'Rating Scale'
                            : q.type === 'multi'
                            ? 'Multiple Choice'
                            : q.type === 'dropdown'
                            ? 'Dropdown Selection'
                            : q.type === 'yesno'
                            ? 'Yes / No Toggle'
                            : 'Open-Ended Text'}
                        </span>
                      </div>

                      <div className="flex items-center gap-space-md">
                        <label className="flex items-center gap-space-xs cursor-pointer">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">Required</span>
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) => updateQuestionRequired(q.id, e.target.checked)}
                            className="w-4 h-4 accent-primary cursor-pointer rounded"
                          />
                        </label>

                        <div className="h-4 w-px bg-outline-variant/40"></div>

                        <select
                          value={q.type}
                          onChange={(e) => updateQuestionType(q.id, e.target.value as QuestionType)}
                          className="bg-surface-container-low text-on-surface font-label-sm text-label-sm py-1 px-space-xs rounded-lg outline-none cursor-pointer"
                        >
                          <option value="single">Single Choice (Radio)</option>
                          <option value="multi">Multiple Choice (Checkboxes)</option>
                          <option value="rating">Rating Scale (1-5)</option>
                          <option value="dropdown">Dropdown Selection</option>
                          <option value="yesno">Yes/No Toggle</option>
                          <option value="text">Open-Ended Text</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => deleteQuestion(q.id)}
                          title="Delete question"
                          className="text-outline hover:text-error transition-colors p-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt Input */}
                    <div className="mb-space-md">
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => updateQuestionPrompt(q.id, e.target.value)}
                        className="w-full font-headline-sm text-headline-sm text-on-surface bg-transparent focus:bg-surface-container-low px-space-xs py-1 rounded-lg outline-none font-semibold transition-colors"
                      />
                    </div>

                    {/* Question Type Specific Body */}
                    {q.type === 'single' && (
                      <div className="space-y-space-xs mb-space-sm">
                        {(q.options || []).map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className="flex items-center gap-space-sm p-space-xs rounded-lg bg-surface-container-low/50 group"
                          >
                            <span className="material-symbols-outlined text-outline text-[16px]">
                              radio_button_unchecked
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOptionText(q.id, optIdx, e.target.value)}
                              className="flex-1 bg-transparent text-on-surface font-body-sm text-body-sm outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(q.id, optIdx)}
                              className="text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addOption(q.id)}
                          className="inline-flex items-center gap-1 text-primary-container hover:text-primary font-label-sm text-label-sm font-semibold p-space-xs rounded hover:bg-surface-container-low transition-colors cursor-pointer mt-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                          <span>Add option</span>
                        </button>
                      </div>
                    )}

                    {q.type === 'rating' && (
                      <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-sm">
                        <div className="grid grid-cols-5 gap-space-xs sm:gap-space-sm">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              className={`flex flex-col items-center justify-center py-space-sm rounded-lg transition-all font-headline-sm text-headline-sm font-bold shadow-sm group cursor-pointer ${
                                num === 4
                                  ? 'bg-primary-container text-on-primary'
                                  : 'bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-on-surface'
                              }`}
                            >
                              <span>{num}</span>
                              <span
                                className={`material-symbols-outlined text-[14px] ${
                                  num === 4 ? 'text-on-primary' : 'text-outline group-hover:text-on-primary'
                                }`}
                                style={num === 4 ? { fontVariationSettings: "'FILL' 1" } : {}}
                              >
                                star
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between items-center px-space-xs font-label-sm text-label-sm text-outline">
                          <span>{q.minLabel || 'Very Difficult'}</span>
                          <span>Neutral</span>
                          <span>{q.maxLabel || 'Extremely Easy'}</span>
                        </div>
                      </div>
                    )}

                    {q.type === 'multi' && (
                      <div className="space-y-space-xs mb-space-sm">
                        {(q.options || []).map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className="flex items-center gap-space-sm p-space-xs rounded-lg bg-surface-container-low/50 group"
                          >
                            <span className="material-symbols-outlined text-outline text-[18px]">
                              check_box_outline_blank
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOptionText(q.id, optIdx, e.target.value)}
                              className="flex-1 bg-transparent text-on-surface font-body-sm text-body-sm outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(q.id, optIdx)}
                              className="text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addOption(q.id)}
                          className="inline-flex items-center gap-1 text-primary-container hover:text-primary font-label-sm text-label-sm font-semibold p-space-xs rounded hover:bg-surface-container-low transition-colors cursor-pointer mt-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                          <span>Add option</span>
                        </button>
                      </div>
                    )}

                    {q.type === 'dropdown' && (
                      <div className="space-y-space-xs bg-surface-container-low p-space-md rounded-lg">
                        <div className="flex items-center justify-between mb-space-xs">
                          <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                            Selectable Options in List
                          </label>
                          <button
                            type="button"
                            onClick={() => addOption(q.id)}
                            className="font-label-sm text-primary flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            <span>Add value</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
                          {(q.options || ['Engineering', 'Product Management', 'Design', 'Operations']).map(
                            (opt, oIdx) => (
                              <div
                                key={oIdx}
                                className="flex items-center justify-between px-space-sm py-1.5 bg-surface-container-lowest rounded text-body-sm font-body-sm shadow-sm group"
                              >
                                <span className="truncate">
                                  {oIdx + 1}. {opt}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => removeOption(q.id, oIdx)}
                                    className="opacity-0 group-hover:opacity-100 text-outline hover:text-error transition-opacity cursor-pointer p-0.5"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                  <span className="material-symbols-outlined text-outline text-[16px]">menu</span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {q.type === 'yesno' && (
                      <div className="flex gap-space-md max-w-xs">
                        <button
                          type="button"
                          className="flex-1 py-space-sm px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold flex items-center justify-center gap-space-xs transition-colors shadow-sm cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-secondary text-[20px]">thumb_up</span>
                          <span>Yes</span>
                        </button>
                        <button
                          type="button"
                          className="flex-1 py-space-sm px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold flex items-center justify-center gap-space-xs transition-colors shadow-sm cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-outline text-[20px]">thumb_down</span>
                          <span>No</span>
                        </button>
                      </div>
                    )}

                    {q.type === 'text' && (
                      <div className="relative">
                        <textarea
                          rows={3}
                          disabled
                          placeholder={q.placeholder || 'User response preview area (rich markdown supported in submission)...'}
                          className="w-full bg-surface-container-low p-space-md rounded-lg font-body-sm text-body-sm text-outline resize-none cursor-not-allowed"
                        />
                        <div className="flex justify-between items-center mt-1 px-1">
                          <span className="font-code-sm text-code-sm text-outline">Multi-line textarea</span>
                          <span className="font-code-sm text-code-sm text-outline">0 / 500 characters</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Question Expandable Toolbar */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border-2 border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-space-md text-center hover:border-primary-container transition-all">
              <div className="flex items-center gap-space-xs text-on-surface font-headline-sm text-headline-sm font-semibold">
                <span className="material-symbols-outlined text-primary-container">add_circle</span>
                <span>Add Next Question</span>
              </div>
              <p className="font-body-sm text-body-sm text-outline max-w-md">
                Select an input typology below to immediately append a new parameterized node to this survey sequence.
              </p>

              {/* Quick Selection Buttons for All 6 Types */}
              <div className="flex flex-wrap gap-space-xs justify-center max-w-2xl">
                <button
                  type="button"
                  onClick={() => addNewQuestion('single')}
                  className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-label-md transition-all shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">radio_button_checked</span>
                  <span>Single Choice</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewQuestion('multi')}
                  className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-label-md transition-all shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">check_box</span>
                  <span>Multiple Choice</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewQuestion('rating')}
                  className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-label-md transition-all shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">star_rate</span>
                  <span>Rating Scale 1-5</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewQuestion('dropdown')}
                  className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-label-md transition-all shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_drop_down_circle</span>
                  <span>Dropdown</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewQuestion('yesno')}
                  className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-label-md transition-all shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">thumbs_up_down</span>
                  <span>Yes / No</span>
                </button>

                <button
                  type="button"
                  onClick={() => addNewQuestion('text')}
                  className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-label-md transition-all shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">short_text</span>
                  <span>Open Text</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Survey Structure Inspector & Global Logic (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-space-lg sticky top-36">
            {/* Outline & Quick Jump Navigator Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
              <div className="flex items-center justify-between pb-space-sm mb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[20px]">account_tree</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Survey Outline</h3>
                </div>
                <span className="font-code-sm text-code-sm bg-surface-container px-space-xs py-0.5 rounded text-on-surface-variant font-semibold">
                  {currentSurvey.questions.length} Questions
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-outline mb-space-sm">
                Click any question node to smoothly focus and navigate the builder viewport.
              </p>

              <nav className="space-y-1 max-h-80 overflow-y-auto">
                {currentSurvey.questions.map((q, idx) => {
                  const icon =
                    q.type === 'single'
                      ? 'radio_button_checked'
                      : q.type === 'rating'
                      ? 'star'
                      : q.type === 'multi'
                      ? 'check_box'
                      : q.type === 'dropdown'
                      ? 'arrow_drop_down'
                      : q.type === 'yesno'
                      ? 'thumb_up'
                      : 'subject';

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => scrollToQuestion(q.id)}
                      className="w-full flex items-center gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-low text-on-surface transition-colors group text-left cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-full bg-primary-container/10 group-hover:bg-primary-container group-hover:text-on-primary text-primary-container flex items-center justify-center font-code-sm text-code-sm font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-body-sm text-body-sm truncate flex-1 font-medium">
                        {q.title || `Question ${idx + 1}`}
                      </span>
                      <span className="material-symbols-outlined text-outline text-[16px] shrink-0">
                        {icon}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Display & Flow Logic Configuration Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
              <div className="flex items-center gap-space-xs pb-space-sm mb-space-sm">
                <span className="material-symbols-outlined text-primary-container text-[20px]">toggle_on</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Display &amp; Logic Settings
                </h3>
              </div>

              <div className="space-y-space-md">
                {/* Progress Bar Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-semibold">Show Progress Bar</p>
                    <p className="font-body-sm text-body-sm text-outline">Displays respondent completion % at top</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSurvey.showProgressBar}
                      onChange={() => handleSettingToggle('showProgressBar')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
                  </label>
                </div>

                {/* Randomize Order Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-semibold">Randomize Order</p>
                    <p className="font-body-sm text-body-sm text-outline">Shuffle non-introductory question cards</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSurvey.randomizeOrder}
                      onChange={() => handleSettingToggle('randomizeOrder')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
                  </label>
                </div>

                {/* One Response Per User Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-semibold">One Response Per User</p>
                    <p className="font-body-sm text-body-sm text-outline">Prevent ballot stuffing via fingerprinting</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSurvey.oneResponsePerUser}
                      onChange={() => handleSettingToggle('oneResponsePerUser')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Database Integrity & Methodological Assurance Card */}
            <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm">
              <div className="flex items-start gap-space-sm">
                <span className="material-symbols-outlined text-secondary text-[24px]">verified</span>
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface font-bold">
                    Database Integrity Assured
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                    All questions and options serialize into parameterized SQLite tables with cascading foreign keys. Survey edits never cause data corruption on live responses.
                  </p>
                  <div className="mt-space-sm flex items-center gap-space-xs font-code-sm text-code-sm text-outline">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    <span>ACID Compliant • WAL Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Respondent Preview Modal Dialogue */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-[#0d1c2e]/50 backdrop-blur-sm flex items-center justify-center p-space-md animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-xl max-w-2xl w-full p-space-xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-space-md mb-space-md border-b border-outline-variant/20">
              <div>
                <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">
                  Respondent Mode Preview
                </span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">
                  {currentSurvey.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-outline hover:text-on-surface p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Simulated Progress Bar */}
            {currentSurvey.showProgressBar && (
              <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden mb-space-lg">
                <div className="bg-primary-container h-full w-2/5 transition-all duration-300"></div>
              </div>
            )}

            <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg leading-relaxed">
              {currentSurvey.welcomeMessage}
            </p>

            {/* Preview interactive questions */}
            <div className="space-y-space-md mb-space-lg">
              {currentSurvey.questions.slice(0, 3).map((q, idx) => (
                <div key={q.id} className="p-space-md bg-surface-container-low rounded-lg">
                  <span className="font-label-sm text-label-sm font-semibold text-outline uppercase block mb-1">
                    Question {idx + 1}
                  </span>
                  <p className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-space-sm">
                    {q.title}
                  </p>

                  {q.type === 'single' && (
                    <div className="space-y-space-xs">
                      {(q.options || []).map((opt, oIdx) => (
                        <label
                          key={oIdx}
                          className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest cursor-pointer hover:bg-surface-container-high transition-colors"
                        >
                          <input
                            type="radio"
                            name={`preview-${q.id}`}
                            checked={previewAnswers[q.id] === opt}
                            onChange={() => setPreviewAnswers({ ...previewAnswers, [q.id]: opt })}
                            className="accent-primary"
                          />
                          <span className="font-body-sm text-body-sm text-on-surface">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === 'rating' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: num })}
                          className={`flex-1 py-2 rounded-lg font-bold text-sm ${
                            previewAnswers[q.id] === num
                              ? 'bg-primary-container text-on-primary'
                              : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                          }`}
                        >
                          {num} ★
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === 'multi' && (
                    <div className="space-y-space-xs">
                      {(q.options || []).map((opt, oIdx) => (
                        <label
                          key={oIdx}
                          className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-lowest cursor-pointer hover:bg-surface-container-high transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={Array.isArray(previewAnswers[q.id]) && previewAnswers[q.id].includes(opt)}
                            onChange={(e) => {
                              const curr = Array.isArray(previewAnswers[q.id]) ? [...previewAnswers[q.id]] : [];
                              if (e.target.checked) curr.push(opt);
                              else {
                                const i = curr.indexOf(opt);
                                if (i > -1) curr.splice(i, 1);
                              }
                              setPreviewAnswers({ ...previewAnswers, [q.id]: curr });
                            }}
                            className="accent-primary rounded"
                          />
                          <span className="font-body-sm text-body-sm text-on-surface">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-space-sm pt-space-xs">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-space-md py-2 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md cursor-pointer hover:bg-surface-container-high transition-colors"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={handlePreviewSubmit}
                className="px-space-lg py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md cursor-pointer hover:bg-primary transition-colors font-semibold"
              >
                Submit Sample
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
