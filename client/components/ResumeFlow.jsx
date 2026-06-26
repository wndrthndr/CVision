'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DocumentScanner from './DocumentScanner';

function StepRail({ stage }) {
  const steps = ['Resume', 'Target', 'Report'];
  const activeIndex =
    stage === 'upload' ? 0 : stage === 'target' ? 1 : stage === 'results' ? 2 : 2;

  return (
    <div className="mx-auto mb-10 flex max-w-md items-center justify-between">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Andika:ital,wght@0,400;0,700;1,400;1,700&family=Familjen+Grotesk:ital,wght@0,400..700;1,400..700&display=swap');
      `}} />
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                index <= activeIndex
                  ? 'bg-[#d9ff5a] text-[#171613]'
                  : 'border border-white/15 text-[#aaa398]'
              }`}
            >
              {index < activeIndex ? '✓' : `0${index + 1}`}
            </span>
            <span
              className={`hidden text-[10px] uppercase tracking-[0.16em] sm:block ${
                index <= activeIndex ? 'text-[#f2eee6]' : 'text-[#777168]'
              }`}
            >
              {step}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div className="mx-2 h-px flex-1 bg-white/10" />
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
    <section className="relative min-h-[620px]">
      <StepRail stage={stage} />

      <AnimatePresence mode="wait">
        {stage === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, x: -180, scale: 0.9 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mx-auto max-w-xl"
          >
            <div
              className={`dossier-card rounded-[30px] p-7 sm:p-10 ${
                dragging ? 'border-[#d9ff5a]/70' : ''
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
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#d9ff5a]">
                Resume dossier / 01
              </p>

              <h2 className="editorial-title mt-3 text-4xl leading-[0.95] sm:text-5xl">
                Start with
                <br />
                your story.
              </h2>

              <p className="mt-5 max-w-md text-sm leading-relaxed text-[#aaa398]">
                Drop your resume and we will turn it into a role-specific report
                with clear next moves.
              </p>

              <div className="mt-9 rounded-2xl border border-dashed border-white/20 bg-white/[0.025] p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d9ff5a]/40 text-xl text-[#d9ff5a]">
                  ↓
                </div>

                <p className="mt-4 text-base text-[#f2eee6]">
                  Drop your resume here
                </p>

                <p className="mt-1 text-xs text-[#777168]">
                  PDF only · Maximum 5 MB
                </p>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="outline-button mt-5 rounded-xl px-5 py-2.5 text-sm"
                >
                  Choose PDF
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
                <p className="mt-4 text-sm text-[#ff8e7f]">{error}</p>
              )}
            </div>
          </motion.div>
        )}

        {stage === 'target' && (
          <motion.div
            key="target"
            initial={{ opacity: 0, x: 180, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mx-auto max-w-xl"
          >
            <div className="dossier-card rounded-[30px] p-7 sm:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#d9ff5a]">
                    Target dossier / 02
                  </p>

                  <h2 className="editorial -title mt-3 text-4xl leading-[0.95] sm:text-5xl">
                    Where should
                    <br />
                    this resume go?
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={resetFile}
                  className="text-xs uppercase tracking-wider text-[#aaa398] hover:text-[#f2eee6]"
                >
                  Change PDF
                </button>
              </div>

              <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm text-[#f2eee6]">{file?.name}</p>
                <p className="mt-1 text-xs text-[#777168]">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · PDF ready` : ''}
                </p>
              </div>

              <div className="mt-7 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('role')}
                  className={`rounded-full px-4 py-2 text-xs uppercase tracking-wider transition ${
                    mode === 'role'
                      ? 'bg-[#d9ff5a] text-[#171613]'
                      : 'border border-white/15 text-[#aaa398]'
                  }`}
                >
                  Target role
                </button>

                <button
                  type="button"
                  onClick={() => setMode('jd')}
                  className={`rounded-full px-4 py-2 text-xs uppercase tracking-wider transition ${
                    mode === 'jd'
                      ? 'bg-[#d9ff5a] text-[#171613]'
                      : 'border border-white/15 text-[#aaa398]'
                  }`}
                >
                  Full job description
                </button>
              </div>

              <AnimatePresence mode="wait">
                {mode === 'role' ? (
                  <motion.div
                    key="role"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-5"
                  >
                    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-[#aaa398]">
                      Target role
                    </label>

                    <input
                      value={jobRole}
                      onChange={(event) => setJobRole(event.target.value)}
                      className="dossier-input px-4 py-3.5"
                      placeholder="Frontend Developer, Java Developer, Data Analyst..."
                    />

                    <p className="mt-3 text-xs leading-relaxed text-[#777168]">
                      A job title gives a focused report. Add the full description
                      if you want a more precise match.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="jd"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-5"
                  >
                    <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-[#aaa398]">
                      Job description
                    </label>

                    <textarea
                      value={jobDescription}
                      onChange={(event) => setJobDescription(event.target.value)}
                      rows={7}
                      className="dossier-input resize-none px-4 py-3.5"
                      placeholder="Paste the role description here..."
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <p className="mt-4 text-sm text-[#ff8e7f]">{error}</p>
              )}

              <button
                type="button"
                onClick={analyzeResume}
                className="accent-button mt-8 w-full rounded-xl px-5 py-3.5 text-sm font-semibold"
              >
                Build my report →
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.4 }}
          >
            <DocumentScanner percent={percent} message={loadingMessage} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
