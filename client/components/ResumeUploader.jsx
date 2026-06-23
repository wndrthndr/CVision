'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ANALYSIS_STEPS = [
  {
    id: 'upload',
    label: 'Uploading your resume',
    detail: 'Sending your PDF securely for analysis.',
    startAt: 0,
  },
  {
    id: 'extract',
    label: 'Reading resume structure',
    detail: 'Extracting skills, projects, education, and experience.',
    startAt: 20,
  },
  {
    id: 'match',
    label: 'Matching role requirements',
    detail: 'Comparing your resume with the target role.',
    startAt: 42,
  },
  {
    id: 'ai',
    label: 'Generating tailored insights',
    detail: 'Building personalized strengths, gaps, and rewrite suggestions.',
    startAt: 64,
  },
  {
    id: 'report',
    label: 'Preparing your report',
    detail: 'Organizing your results into actionable next steps.',
    startAt: 84,
  },
];

export default function ResumeUploader({
  setResumeFile,
  resumeFile,
  setPercent,
  percent,
  setLoadingAnalysis,
  loadingAnalysis,
  onResult,
}) {
  const fileInputRef = useRef(null);
  const progressTimerRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState('role');
  const [jobRole, setJobRole] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  const [analysisStage, setAnalysisStage] = useState('upload');
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    return () => {
      stopAnalysisProgress();
    };
  }, []);

  function handleFiles(files) {
    const file = files?.[0];

    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Please upload a PDF smaller than 5 MB.');
      return;
    }

    setResumeFile(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function stopAnalysisProgress() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function getStageFromPercent(currentPercent) {
    if (currentPercent < 20) return 'upload';
    if (currentPercent < 42) return 'extract';
    if (currentPercent < 64) return 'match';
    if (currentPercent < 84) return 'ai';
    return 'report';
  }

  function getMessageForStage(stage, seconds) {
    if (stage === 'upload') {
      return 'Getting your resume ready...';
    }

    if (stage === 'extract') {
      return 'Finding your skills, projects, and experience...';
    }

    if (stage === 'match') {
      return 'Comparing your profile with the role...';
    }

    if (stage === 'ai') {
      if (seconds > 12) {
        return 'Still working on tailored recommendations...';
      }

      return 'Generating personalized resume feedback...';
    }

    if (stage === 'report') {
      if (seconds > 18) {
        return 'Almost there — polishing your report...';
      }

      return 'Preparing your final insights...';
    }

    return 'Analyzing your resume...';
  }

  function startAnalysisProgress() {
    stopAnalysisProgress();

    let current = 20;
    let seconds = 0;

    setPercent(current);
    setAnalysisStage('extract');
    setAnalysisMessage('Reading your resume structure...');
    setElapsedSeconds(0);

    progressTimerRef.current = setInterval(() => {
      seconds += 1;
      setElapsedSeconds(seconds);

      // Move slowly and never reach 100 before backend responds.
      if (current < 45) {
        current += 3;
      } else if (current < 68) {
        current += 2;
      } else if (current < 86) {
        current += 1;
      } else if (current < 92) {
        current += 0.5;
      }

      current = Math.min(current, 92);

      const nextStage = getStageFromPercent(current);

      setPercent(Math.round(current));
      setAnalysisStage(nextStage);
      setAnalysisMessage(getMessageForStage(nextStage, seconds));
    }, 900);
  }

  function buildJobPayload() {
    if (mode === 'jd') {
      return jobDesc.trim();
    }

    const role = jobRole.trim();

    return `
Target role: ${role}

Evaluate this resume for the target role.
Focus on relevant technical skills, projects, experience,
ATS keywords, measurable achievements, and practical improvements.
    `.trim();
  }

  function resetLoadingState() {
    stopAnalysisProgress();
    setPercent(null);
    setAnalysisStage('upload');
    setAnalysisMessage('');
    setElapsedSeconds(0);
    setLoadingAnalysis(false);
  }

  async function startUploadAndAnalyze() {
    if (!resumeFile) {
      alert('Please upload a PDF first.');
      return;
    }

    if (mode === 'role' && !jobRole.trim()) {
      alert('Please enter a target job role.');
      return;
    }

    if (mode === 'jd' && !jobDesc.trim()) {
      alert('Please paste a job description.');
      return;
    }

    setLoadingAnalysis(true);
    setPercent(2);
    setAnalysisStage('upload');
    setAnalysisMessage('Uploading your resume...');
    setElapsedSeconds(0);

    const API = process.env.NEXT_PUBLIC_API_URL;
    const jobPayload = buildJobPayload();

    if (!API) {
      let demoProgress = 3;

      const demoTimer = setInterval(() => {
        demoProgress = Math.min(demoProgress + 6, 92);

        const stage = getStageFromPercent(demoProgress);

        setPercent(demoProgress);
        setAnalysisStage(stage);
        setAnalysisMessage(getMessageForStage(stage, 0));

        if (demoProgress >= 92) {
          clearInterval(demoTimer);
        }
      }, 500);

      await new Promise((resolve) => setTimeout(resolve, 5000));

      clearInterval(demoTimer);

      const fake = {
        overall_match_score: 82,
        keyword_alignment: {
          matched: ['React', 'Next.js', 'Tailwind'],
          missing: ['Docker'],
        },
        skill_strengths: [
          'Strong component architecture',
          'Good responsive UI implementation',
        ],
        skill_gaps: ['Testing experience'],
        achievement_rewrites: [
          'Improved frontend performance and reduced bundle size by 25%.',
        ],
        formatting_issues: ['Inconsistent bullet styles'],
        grammar_issues: ['Minor tense inconsistency'],
        final_recommendation:
          'Lead with measurable outcomes and add a concise role-specific summary.',
      };

      setPercent(100);
      setAnalysisStage('report');
      setAnalysisMessage('Your report is ready.');

      setTimeout(() => {
        onResult({
          gemini_analysis: fake,
          subscores_computed_locally: {
            keyword: 76,
            experience: 81,
            achievements: 70,
            formatting: 88,
            grammar: 85,
          },
        });

        resetLoadingState();
      }, 450);

      return;
    }

    try {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();

      fd.append('resume_file', resumeFile);
      fd.append('job_description', jobPayload);

      xhr.open('POST', `${API}/analyze-job`);

      xhr.upload.onprogress = function (e) {
        if (!e.lengthComputable) return;

        // Upload takes only first 20% of visual progress.
        const uploadPercent = Math.round((e.loaded / e.total) * 20);

        setPercent(Math.max(2, uploadPercent));
        setAnalysisStage('upload');
        setAnalysisMessage('Uploading your resume...');
      };

      xhr.upload.onload = function () {
        startAnalysisProgress();
      };

      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;

        stopAnalysisProgress();

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);

            console.log('Backend performance:', data.performance);

            const normalized = data.gemini_analysis
              ? data
              : { gemini_analysis: data };

            setPercent(100);
            setAnalysisStage('report');
            setAnalysisMessage('Your report is ready.');

            setTimeout(() => {
              onResult(normalized);
              resetLoadingState();
            }, 500);
          } catch (error) {
            console.error(
              'Failed to parse JSON from server:',
              error,
              xhr.responseText
            );

            resetLoadingState();
            alert('Server returned invalid JSON. Check console for details.');
          }

          return;
        }

        console.error('Upload failed', xhr.status, xhr.responseText);

        resetLoadingState();

        try {
          const errorData = JSON.parse(xhr.responseText);
          alert(errorData.error || 'Analysis failed. Please try again.');
        } catch {
          alert('Analysis failed. Please try again.');
        }
      };

      xhr.onerror = function (error) {
        console.error('Network error', error);
        resetLoadingState();
        alert('Network error during upload.');
      };

      xhr.send(fd);
    } catch (error) {
      console.error('Upload start error', error);
      resetLoadingState();
      alert('Could not start upload.');
    }
  }

  const currentStepIndex = ANALYSIS_STEPS.findIndex(
    (step) => step.id === analysisStage
  );

  return (
    <motion.div
      layout
      className="glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl"
    >
      <motion.div
        whileHover={!loadingAnalysis ? { scale: 1.01 } : undefined}
        className={`rounded-2xl border-2 p-6 transition ${
          dragging
            ? 'border-accent1 bg-accent1/8'
            : 'border-white/10 bg-white/6'
        }`}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent1 to-accent2 font-bold text-black">
            PDF
          </div>

          <div>
            <p className="text-lg font-semibold text-gray-200">
              Upload Resume
            </p>

            <p className="text-sm text-gray-400">
              Upload a PDF and get tailored ATS feedback.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <label
            className={`inline-flex cursor-pointer items-center gap-3 rounded-xl px-5 py-2 text-sm transition ${
              loadingAnalysis
                ? 'cursor-not-allowed bg-white/5 text-gray-500'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Choose File

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={loadingAnalysis}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>

          <div className="max-w-[220px] truncate text-sm text-gray-300">
            {resumeFile ? resumeFile.name : 'No file selected'}
          </div>
        </div>

        <AnimatePresence>
          {resumeFile && !loadingAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mt-4 flex items-center justify-between rounded-xl border border-green-400/10 bg-green-400/[0.06] p-3"
            >
              <div>
                <p className="text-sm font-medium text-green-200">
                  Resume ready
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {(resumeFile.size / 1024 / 1024).toFixed(2)} MB · PDF
                </p>
              </div>

              <span className="text-lg text-green-300">✓</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6">
          <div className="mb-4 flex gap-3">
            <button
              className={`rounded-lg px-4 py-2 text-sm transition ${
                mode === 'role'
                  ? 'bg-accent1 font-semibold text-black'
                  : 'bg-white/10 text-gray-300 hover:bg-white/15'
              }`}
              onClick={() => setMode('role')}
              type="button"
              disabled={loadingAnalysis}
            >
              Job Role
            </button>

            <button
              className={`rounded-lg px-4 py-2 text-sm transition ${
                mode === 'jd'
                  ? 'bg-accent1 font-semibold text-black'
                  : 'bg-white/10 text-gray-300 hover:bg-white/15'
              }`}
              onClick={() => setMode('jd')}
              type="button"
              disabled={loadingAnalysis}
            >
              Job Description
            </button>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'role' ? (
              <motion.input
                key="role-input"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                placeholder="Ex: Frontend Developer, Data Analyst..."
                className="w-full rounded-xl border border-white/10 bg-white/10 p-3 outline-none transition focus:border-accent1/60"
                value={jobRole}
                disabled={loadingAnalysis}
                onChange={(e) => setJobRole(e.target.value)}
              />
            ) : (
              <motion.textarea
                key="jd-input"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                rows={5}
                placeholder="Paste the job description here..."
                className="w-full rounded-xl border border-white/10 bg-white/10 p-4 outline-none transition focus:border-accent1/60"
                value={jobDesc}
                disabled={loadingAnalysis}
                onChange={(e) => setJobDesc(e.target.value)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ================================================= */}
        {/* LIVE ANALYSIS EXPERIENCE                          */}
        {/* ================================================= */}
        <AnimatePresence>
          {percent != null && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 8 }}
              className="mt-6 overflow-hidden"
            >
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {analysisMessage || 'Analyzing your resume...'}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {elapsedSeconds > 8
                        ? 'This can take a few seconds while AI prepares tailored feedback.'
                        : 'Please keep this tab open while we prepare your report.'}
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-semibold text-accent1">
                    {percent}%
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-accent1 to-accent2"
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                </div>

                <div className="mt-5 space-y-3">
                  {ANALYSIS_STEPS.map((step, index) => {
                    const isComplete = index < currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const isUpcoming = index > currentStepIndex;

                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`flex items-start gap-3 ${
                          isUpcoming ? 'opacity-40' : 'opacity-100'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                            isComplete
                              ? 'bg-green-400/20 text-green-300'
                              : isCurrent
                                ? 'bg-accent1 text-black'
                                : 'bg-white/10 text-gray-500'
                          }`}
                        >
                          {isComplete ? '✓' : isCurrent ? '•' : index + 1}
                        </span>

                        <div>
                          <p
                            className={`text-xs font-medium ${
                              isCurrent ? 'text-white' : 'text-gray-300'
                            }`}
                          >
                            {step.label}
                          </p>

                          {isCurrent && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {step.detail}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {elapsedSeconds >= 15 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 border-t border-white/10 pt-3 text-xs text-gray-500"
                  >
                    Almost there — the AI is finishing your personalized recommendations.
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6">
          <button
            onClick={startUploadAndAnalyze}
            disabled={loadingAnalysis}
            className="w-full rounded-xl bg-gradient-to-br from-accent1 to-accent2 py-3 font-bold text-black shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAnalysis
              ? analysisStage === 'ai'
                ? 'Creating Your Recommendations…'
                : 'Analyzing Your Resume…'
              : 'Analyze My Resume'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
