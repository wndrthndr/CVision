'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

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
  const cardRef = useRef(null);

  const [mode, setMode] = useState('role');
  const [jobRole, setJobRole] = useState('');
  const [jobDesc, setJobDesc] = useState('');

  /* subtle idle breathing motion */
  useEffect(() => {
    gsap.to(cardRef.current, {
      y: -6,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, []);

  function handleFiles(files) {
    const file = files?.[0];
    if (!file) return;
    setResumeFile(file);
  }

  async function startUploadAndAnalyze() {
    if (!resumeFile) return alert('Please upload a PDF first.');
    setLoadingAnalysis(true);
    setPercent(5);

    // keep your existing logic untouched
    onResult?.();
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: 'power3.out' }}
      className="editorial-card p-12 text-center"
    >
      {/* TOP LABEL */}
      <p className="uppercase tracking-widest text-xs text-gray-500">
        Resume upload
      </p>

      <h2 className="font-display text-3xl mt-4">
        Begin your resume analysis
      </h2>

      <p className="text-gray-400 mt-3 max-w-md mx-auto text-sm">
        Upload a single PDF. We’ll analyze structure, skills, clarity, and
        alignment with your target role.
      </p>

      {/* FILE PICKER */}
      <div className="mt-10">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => fileInputRef.current?.click()}
          className="px-8 py-4 rounded-full bg-white text-black font-semibold shadow-xl"
        >
          {resumeFile ? 'Change PDF' : 'Choose PDF'}
        </motion.button>

        <p className="mt-3 text-xs text-gray-400">
          {resumeFile ? resumeFile.name : 'PDF only · Max 5MB'}
        </p>
      </div>

      {/* ROLE / JD */}
      <div className="mt-10 text-left">
        <div className="flex gap-3 mb-4 justify-center">
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              placeholder="e.g. Frontend Engineer"
              className="w-full mt-2 p-4 rounded-2xl bg-white/5 border border-white/10 outline-none"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
            />
          )}

          {mode === 'jd' && (
            <motion.textarea
              key="jd"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              rows={5}
              placeholder="Paste the job description here…"
              className="w-full mt-2 p-4 rounded-2xl bg-white/5 border border-white/10 outline-none"
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
            className="mt-8"
          >
            <div className="h-[2px] w-full bg-white/10 overflow-hidden">
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
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={startUploadAndAnalyze}
          disabled={loadingAnalysis}
          className="px-10 py-4 rounded-full bg-gradient-to-br from-accent1 to-accent2 text-black font-bold tracking-wide shadow-2xl"
        >
          {loadingAnalysis ? 'Analyzing…' : 'Generate Insights'}
        </motion.button>
      </div>
    </motion.div>
  );
}

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
