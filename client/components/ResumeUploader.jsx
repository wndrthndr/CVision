'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [dragging, setDragging] = useState(false);

  const [mode, setMode] = useState('role');
  const [jobRole, setJobRole] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  /* ===========================
     FILE HANDLING (UNCHANGED)
  =========================== */
  function handleFiles(files) {
    const file = files?.[0];
    if (!file) return;
    setResumeFile(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  async function startUploadAndAnalyze() {
    if (!resumeFile) return alert('Please upload a PDF first.');
    setLoadingAnalysis(true);
    setPercent(3);

    const API = process.env.NEXT_PUBLIC_API_URL;
    const jobPayload = mode === 'role' ? (jobRole || '') : (jobDesc || '');

    if (!API) {
      for (let p = 5; p <= 88; p += 7) {
        await new Promise((r) => setTimeout(r, 140 + Math.random() * 180));
        setPercent(p);
      }
      setPercent(100);
      await new Promise((r) => setTimeout(r, 220));

      onResult({
        gemini_analysis: {
          overall_match_score: 82,
          keyword_alignment: {
            matched: ['React', 'Next.js', 'Tailwind'],
            missing: ['Docker'],
          },
          skill_strengths: ['Component architecture', 'Responsive UI'],
          skill_gaps: ['Testing'],
          achievement_rewrites: ['Reduced bundle size by 25% — updated'],
          formatting_issues: ['Inconsistent bullet styles'],
          grammar_issues: ['Minor tense mix'],
          final_recommendation:
            'Lead with measurable outcomes and add a short summary.',
        },
        subscores_computed_locally: { relevance: 81, keywords: 76 },
      });

      setPercent(null);
      setLoadingAnalysis(false);
      return;
    }

    /* REAL UPLOAD (UNCHANGED) */
    try {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('resume_file', resumeFile);
      fd.append('job_description', jobPayload);

      xhr.open('POST', `${API}/analyze-job`);

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          setPercent(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          setPercent(null);
          setLoadingAnalysis(false);

          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            onResult(data.gemini_analysis ? data : { gemini_analysis: data });
          } else {
            alert('Upload failed.');
          }
        }
      };

      xhr.onerror = () => {
        setPercent(null);
        setLoadingAnalysis(false);
        alert('Network error.');
      };

      xhr.send(fd);
    } catch {
      setPercent(null);
      setLoadingAnalysis(false);
      alert('Could not start upload.');
    }
  }

  /* ===========================
     UI (ENHANCED ONLY)
  =========================== */
  return (
    <motion.div
      layout
      className="editorial-card p-10 text-center"
    >
      {/* HEADER */}
      <p className="uppercase tracking-widest text-xs text-gray-500">
        Resume upload
      </p>

      <h2 className="font-display text-2xl mt-4">
        Begin your analysis
      </h2>

      <p className="text-gray-400 mt-2 max-w-md mx-auto text-sm">
        Upload your resume and optionally specify the role or job description.
      </p>

      {/* DROP ZONE */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        className={`mt-8 rounded-2xl border transition p-6 ${
          dragging
            ? 'border-accent1 bg-accent1/10'
            : 'border-white/10 bg-white/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          type="button"
          className="px-6 py-3 rounded-full bg-white text-black font-semibold shadow-lg"
        >
          {resumeFile ? 'Change PDF' : 'Choose PDF'}
        </button>

        <p className="mt-3 text-xs text-gray-400">
          {resumeFile ? resumeFile.name : 'PDF only · Drag & drop supported'}
        </p>
      </div>

      {/* ROLE / JD TOGGLE */}
      <div className="mt-10">
        <div className="flex justify-center gap-3 mb-4">
          <Toggle active={mode === 'role'} onClick={() => setMode('role')}>
            Job Role
          </Toggle>
          <Toggle active={mode === 'jd'} onClick={() => setMode('jd')}>
            Job Description
          </Toggle>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'role' && (
            <motion.input
              key="role"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none"
              placeholder="e.g. Frontend Developer"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
            />
          )}

          {mode === 'jd' && (
            <motion.textarea
              key="jd"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              rows={5}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 outline-none"
              placeholder="Paste job description…"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* PROGRESS */}
      <AnimatePresence>
        {percent != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6"
          >
            <div className="h-[2px] bg-white/10 overflow-hidden">
              <div
                className="h-[2px] bg-gradient-to-r from-accent1 to-accent2"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Processing… {percent}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <div className="mt-10">
        <button
          onClick={startUploadAndAnalyze}
          disabled={loadingAnalysis}
          className="px-10 py-4 rounded-full bg-gradient-to-br from-accent1 to-accent2 text-black font-bold shadow-xl"
        >
          {loadingAnalysis ? 'Analyzing…' : 'Generate Insights'}
        </button>
      </div>
    </motion.div>
  );
}

/* ===========================
   TOGGLE BUTTON
=========================== */
function Toggle({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={`px-5 py-2 rounded-full text-sm transition ${
        active
          ? 'bg-white text-black font-semibold'
          : 'bg-white/5 text-gray-400 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
