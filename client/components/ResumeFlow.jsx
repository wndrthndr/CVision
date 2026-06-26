'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DocumentScanner from './DocumentScanner';

function StepRail({ stage }) {
  const steps = ['Resume', 'Target', 'Report'];
  const activeIndex =
    stage === 'upload' ? 0 : stage === 'target' ? 1 : stage === 'results' ? 2 : 2;

  return (
    <div className="mx-auto mb-10 flex max-w-md items-center justify-between px-2">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Andika:ital,wght@0,400;0,700;1,400;1,700&family=Familjen+Grotesk:ital,wght@0,400..700;1,400..700&display=swap');
      `}} />
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2.5">
            <span
              className={`font-['Familjen_Grotesk'] flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold tracking-tight transition-all duration-300 ${
                index <= activeIndex
                  ? 'bg-[#d9ff5a] text-[#171613] shadow-[0_0_12px_rgba(217,255,90,0.2)]'
                  : 'border border-white/15 text-[#aaa398]'
              }`}
            >
              {index < activeIndex ? '✓' : `0${index + 1}`}
            </span>
            <span
              className={`font-['Familjen_Grotesk'] hidden text-[11px] font-bold uppercase tracking-[0.2em] sm:block ${
                index <= activeIndex ? 'text-[#f2eee6]' : 'text-[#777168]'
              }`}
            >
              {step}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div className="mx-3 h-px flex-1 bg-white/[0.08]" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ResumeFlow({ onResult }) {
  const inputRef = useRef(null);
  const fakeProgressTimer = useRef(null);

  const [stage, setStage] = useState('upload');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState('role');
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [percent, setPercent] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (fakeProgressTimer.current) clearInterval(fakeProgressTimer.current);
    };
  }, []);

  function selectFile(nextFile) {
    if (!nextFile) return;

    if (nextFile.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    if (nextFile.size > 5 * 1024 * 1024) {
      setError('Please upload a PDF smaller than 5 MB.');
      return;
    }

    setError('');
    setFile(nextFile);

    setTimeout(() => {
      setStage('target');
    }, 350);
  }

  function resetFile() {
    setFile(null);
    setStage('upload');
    setJobRole('');
    setJobDescription('');
    setError('');

    if (inputRef.current) inputRef.current.value = '';
  }

  function startVisualProgress() {
    let current = 18;

    setPercent(current);
    setLoadingMessage('Reading document structure...');

    fakeProgressTimer.current = setInterval(() => {
      if (current < 45) {
        current += 3;
        setLoadingMessage('Extracting skills and projects...');
      } else if (current < 72) {
        current += 1.5;
        setLoadingMessage('Matching target requirements...');
      } else if (current < 92) {
        current += 0.6;
        setLoadingMessage('Preparing your report...');
      }

      current = Math.min(current, 92);
      setPercent(Math.round(current));
    }, 750);
  }

  function stopVisualProgress() {
    if (fakeProgressTimer.current) {
      clearInterval(fakeProgressTimer.current);
      fakeProgressTimer.current = null;
    }
  }

  function buildPayload() {
    if (mode === 'jd') return jobDescription.trim();

    return `Target role: ${jobRole.trim()}

Evaluate this resume for this target role.
Focus on role alignment, ATS keywords, skills, projects, measurable impact,
formatting concerns, grammar, and practical improvements.`;
  }

  async function analyzeResume() {
    if (!file) return;

    if (mode === 'role' && !jobRole.trim()) {
      setError('Enter a target job role first.');
      return;
    }

    if (mode === 'jd' && !jobDescription.trim()) {
      setError('Paste the job description first.');
      return;
    }

    setError('');
    setStage('loading');
    setPercent(5);
    setLoadingMessage('Sending your resume securely...');

    const API = process.env.NEXT_PUBLIC_API_URL;

    if (!API) {
      startVisualProgress();

      setTimeout(() => {
        stopVisualProgress();
        setPercent(100);
        setLoadingMessage('Your report is ready.');

        const demo = {
          gemini_analysis: {
            overall_match_score: 78,
            keyword_alignment: {
              matched: ['React', 'JavaScript', 'Tailwind CSS', 'Git'],
              missing: ['TypeScript', 'Testing', 'Docker'],
            },
            skill_strengths: [
              'Strong frontend project experience with React.',
              'Clear evidence of responsive UI development.',
              'Good deployment and modern tooling exposure.',
            ],
            skill_gaps: [
              'TypeScript is requested but not clearly demonstrated.',
              'Testing experience is not visible in projects.',
              'Docker is not supported by project evidence.',
            ],
            achievement_rewrites: [
              'Built responsive React interfaces and improved usability across desktop and mobile devices.',
              'Developed and deployed a full-stack application using React, Node.js, and MongoDB.',
            ],
            formatting_issues: [
              'Keep bullet punctuation consistent across sections.',
            ],
            grammar_issues: ['Use consistent past tense for completed projects.'],
            final_recommendation:
              'Your frontend foundation is strong. Improve role-specific proof by adding TypeScript, testing, and measurable project outcomes.',
          },
          subscores_computed_locally: {
            keyword: 72,
            experience: 75,
            achievements: 62,
            formatting: 86,
            grammar: 82,
          },
        };

        setTimeout(() => onResult(demo), 500);
      }, 5000);

      return;
    }

    try {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append('resume_file', file);
      formData.append('job_description', buildPayload());

      xhr.open('POST', `${API}/analyze-job`);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;

        const uploadPercent = Math.max(
          5,
          Math.round((event.loaded / event.total) * 18)
        );

        setPercent(uploadPercent);
        setLoadingMessage('Sending your resume securely...');
      };

      xhr.upload.onload = () => {
        startVisualProgress();
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;

        stopVisualProgress();

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const normalized = data.gemini_analysis
              ? data
              : { gemini_analysis: data };

            setPercent(100);
            setLoadingMessage('Your report is ready.');

            setTimeout(() => onResult(normalized), 450);
          } catch {
            setStage('target');
            setError('The server returned an invalid response. Please try again.');
          }

          return;
        }

        setStage('target');

        try {
          const errorData = JSON.parse(xhr.responseText);
          setError(errorData.error || 'Analysis failed. Please try again.');
        } catch {
          setError('Analysis failed. Please try again.');
        }
      };

      xhr.onerror = () => {
        stopVisualProgress();
        setStage('target');
        setError('Network error. Please check your connection and try again.');
      };

      xhr.send(formData);
    } catch {
      stopVisualProgress();
      setStage('target');
      setError('Could not start the analysis. Please try again.');
    }
  }

  return (
    <section className="relative min-h-[600px] w-full">
      <StepRail stage={stage} />

      <AnimatePresence mode="wait">
        {stage === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.97, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, x: -140, scale: 0.96 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mx-auto max-w-xl"
          >
            {/* Interactive Drop Zone Panel */}
            <div
              className={`dossier-card relative overflow-hidden rounded-[32px] border p-8 transition-all duration-300 sm:p-10 ${
                dragging 
                  ? 'border-[#d9ff5a]/60 bg-[#d9ff5a]/[0.02] shadow-[inset_0_0_24px_rgba(217,255,90,0.03)]' 
                  : 'border-white/[0.06] bg-white/[0.01]'
              }`}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                selectFile(event.dataTransfer.files?.[0]);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
            >
              <div className="flex flex-col items-center text-center">
                <p className="font-['Familjen_Grotesk'] text-[10px] font-bold uppercase tracking-[0.24em] text-[#d9ff5a]">
                  Resume studio / 01
                </p>

                <h2 className="font-['Familjen_Grotesk'] mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
                  Start with
                  <br />
                  your story.
                </h2>

                <p className="font-['Andika'] mt-4 max-w-sm text-xs leading-relaxed text-[#aaa398]">
                  Drop your file directly into this canvas to configure your personalized, intelligence-driven evaluation report.
                </p>

                {/* Tactile Inner Drop Box */}
                <div className="mt-8 w-full rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] p-8 transition hover:border-white/20">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#d9ff5a]/20 bg-[#171613] text-lg text-[#d9ff5a]">
                    ↓
                  </div>

                  <p className="font-['Andika'] mt-4 text-sm font-medium text-[#f2eee6]">
                    Drag & drop your resume
                  </p>

                  <p className="font-['Andika'] mt-1 text-xs text-[#777168]">
                    PDF format · up to 5 MB
                  </p>

                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="font-['Familjen_Grotesk'] outline-button mt-5 rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-wider"
                  >
                    Select File
                  </button>

                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(event) => selectFile(event.target.files?.[0])}
                  />
                </div>

                {error && (
                  <p className="font-['Andika'] mt-4 text-xs text-[#ff8e7f]">{error}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'target' && (
          <motion.div
            key="target"
            initial={{ opacity: 0, x: 140, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mx-auto max-w-xl"
          >
            <div className="dossier-card rounded-[32px] border border-white/[0.06] bg-white/[0.01] p-8 sm:p-10">
              
              {/* Header section */}
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-6">
                <div>
                  <p className="font-['Familjen_Grotesk'] text-[10px] font-bold uppercase tracking-[0.24em] text-[#d9ff5a]">
                    Target framework / 02
                  </p>

                  <h2 className="font-['Familjen_Grotesk'] mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl">
                    Where should
                    <br />
                    this resume go?
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={resetFile}
                  className="font-['Familjen_Grotesk'] mt-1 text-[10px] font-bold uppercase tracking-wider text-[#aaa398] transition hover:text-[#d9ff5a]"
                >
                  Change PDF
                </button>
              </div>

              {/* Status File Indicator */}
              <div className="mt-6 flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 border border-white/[0.04]">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-[#d9ff5a] text-sm shrink-0">✓</span>
                  <p className="font-['Andika'] truncate text-xs text-[#e4dfd6]">{file?.name}</p>
                </div>
                <p className="font-['Andika'] shrink-0 text-[11px] text-[#777168] ml-2">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ''}
                </p>
              </div>

              {/* Segmented Controller Tab Bar */}
              <div className="mt-8 grid grid-cols-2 rounded-xl bg-white/[0.03] p-1 border border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => setMode('role')}
                  className={`font-['Familjen_Grotesk'] rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    mode === 'role'
                      ? 'bg-[#d9ff5a] text-[#171613] shadow-sm'
                      : 'text-[#aaa398] hover:text-[#f2eee6]'
                  }`}
                >
                  Target Role
                </button>

                <button
                  type="button"
                  onClick={() => setMode('jd')}
                  className={`font-['Familjen_Grotesk'] rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    mode === 'jd'
                      ? 'bg-[#d9ff5a] text-[#171613] shadow-sm'
                      : 'text-[#aaa398] hover:text-[#f2eee6]'
                  }`}
                >
                  Job Description
                </button>
              </div>

              {/* Interactive Form Switcher */}
              <div className="min-h-[140px]">
                <AnimatePresence mode="wait">
                  {mode === 'role' ? (
                    <motion.div
                      key="role"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="mt-6"
                    >
                      <label className="font-['Familjen_Grotesk'] mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#777168]">
                        Designated Role Title
                      </label>

                      <input
                        value={jobRole}
                        onChange={(event) => setJobRole(event.target.value)}
                        className="font-['Andika'] dossier-input w-full rounded-xl bg-white/[0.02] border border-white/[0.08] px-4 py-3 text-sm text-white focus:border-[#d9ff5a]/30 focus:outline-none focus:ring-0 transition"
                        placeholder="e.g. Frontend Engineer, ML Developer, Data Analyst..."
                      />

                      <p className="font-['Andika'] mt-3 text-xs leading-relaxed text-[#777168]">
                        Gives a high-level targeted report. Switch to structural Job Description for specific phrase requirements.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="jd"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="mt-6"
                    >
                      <label className="font-['Familjen_Grotesk'] mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#777168]">
                        Full Role Specification Content
                      </label>

                      <textarea
                        value={jobDescription}
                        onChange={(event) => setJobDescription(event.target.value)}
                        rows={5}
                        className="font-['Andika'] dossier-input w-full resize-none rounded-xl bg-white/[0.02] border border-white/[0.08] px-4 py-3 text-sm text-white focus:border-[#d9ff5a]/30 focus:outline-none focus:ring-0 transition"
                        placeholder="Paste requirement parameters and operational objectives here..."
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <p className="font-['Andika'] mt-4 text-xs text-[#ff8e7f]">{error}</p>
              )}

              {/* Action Trigger Button */}
              <button
                type="button"
                onClick={analyzeResume}
                className="font-['Familjen_Grotesk'] accent-button mt-6 w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.16em] shadow-[0_4px_20px_rgba(217,255,90,0.15)] hover:shadow-[0_4px_24px_rgba(217,255,90,0.25)] transition-all duration-300"
              >
                Compile Report →
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.35 }}
          >
            <DocumentScanner percent={percent} message={loadingMessage} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
