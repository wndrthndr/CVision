// File: components/ResumeUploader.jsx
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

  // Toggle state for Job Role vs Job Description
  const [mode, setMode] = useState('role'); // 'role' | 'jd'
  const [jobRole, setJobRole] = useState('');
  const [jobDesc, setJobDesc] = useState('');

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
    // Determine the single backend field value (always sent as `job_description`)
    const jobPayload = mode === 'role' ? (jobRole || '') : (jobDesc || '');

    if (!API) {
      // Simulated progress + fake result (for local/demo)
      for (let p = 5; p <= 88; p += 7) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 140 + Math.random() * 180));
        setPercent(p);
      }
      setPercent(100);
      await new Promise((r) => setTimeout(r, 220));
      const fake = {
        overall_match_score: 82,
        keyword_alignment: { matched: ['React', 'Next.js', 'Tailwind'], missing: ['Docker'] },
        skill_strengths: ['Component architecture', 'Responsive UI'],
        skill_gaps: ['Testing'],
        achievement_rewrites: ['Reduced bundle size by 25% — updated'],
        formatting_issues: ['Inconsistent bullet styles'],
        grammar_issues: ['Minor tense mix'],
        final_recommendation: 'Lead with measurable outcomes and add a short summary.',
      };
      onResult({ gemini_analysis: fake, subscores_computed_locally: { relevance: 81, keywords: 76 } });
      setPercent(null);
      setLoadingAnalysis(false);
      return;
    }

    // Real upload using XHR to capture progress events
    try {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('resume_file', resumeFile);
      // ALWAYS append a single field named `job_description` (contains either role or full jd)
      fd.append('job_description', jobPayload);

      xhr.open('POST', `${API}/analyze-job`);

      // progress event
      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          const p = Math.round((e.loaded / e.total) * 100);
          setPercent(p);
        }
      };

      // response handling
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          setPercent(null);
          setLoadingAnalysis(false);

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              const normalized = data.gemini_analysis ? data : { gemini_analysis: data };
              onResult(normalized);
            } catch (err) {
              console.error('Failed to parse JSON from server:', err, xhr.responseText);
              alert('Server returned invalid JSON. Check console for details.');
            }
          } else {
            console.error('Upload failed', xhr.status, xhr.responseText);
            alert('Upload failed. See console for details.');
          }
        }
      };

      // network error handling
      xhr.onerror = function (err) {
        setPercent(null);
        setLoadingAnalysis(false);
        console.error('Network error', err);
        alert('Network error during upload.');
      };

      xhr.send(fd);
    } catch (err) {
      console.error('Upload start error', err);
      setPercent(null);
      setLoadingAnalysis(false);
      alert('Could not start upload.');
    }
  }

  return (
    <motion.div layout className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
      {/* FULL, PROMINENT Uploader — not minimal */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`rounded-2xl p-6 border-2 ${dragging ? 'border-accent1 bg-accent1/8' : 'border-white/10 bg-white/6'}`}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-accent1 to-accent2 flex items-center justify-center font-bold text-black">
            PDF
          </div>
          <div>
            <p className="text-lg text-gray-200 font-semibold">Upload Resume (PDF)</p>
            <p className="text-sm text-gray-400">Drag & drop or choose file — we'll analyze and return actionable insights.</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3 items-center">
          <label className="cursor-pointer inline-flex items-center gap-3 px-5 py-2 bg-white/10 rounded-xl hover:bg-white/20 text-sm">
            Choose File
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>

          <div className="text-sm text-gray-300">{resumeFile ? resumeFile.name : 'No file selected'}</div>
        </div>

        {/* Job Role / Job Description Toggle */}
        <div className="mt-6">
          <div className="flex gap-3 mb-4">
            <button
              className={`px-4 py-2 rounded-lg text-sm ${mode === 'role' ? 'bg-accent1 text-black font-semibold' : 'bg-white/10'}`}
              onClick={() => setMode('role')}
              type="button"
            >
              Job Role
            </button>

            <button
              className={`px-4 py-2 rounded-lg text-sm ${mode === 'jd' ? 'bg-accent1 text-black font-semibold' : 'bg-white/10'}`}
              onClick={() => setMode('jd')}
              type="button"
            >
              Job Description
            </button>
          </div>

          {mode === 'role' && (
            <motion.input
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              placeholder="Ex: Frontend Developer, Data Analyst…"
              className="w-full p-3 bg-white/10 rounded-xl border border-white/10 outline-none"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
            />
          )}

          {mode === 'jd' && (
            <motion.textarea
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              rows={5}
              placeholder="Paste the job description here..."
              className="w-full p-4 bg-white/10 rounded-xl border border-white/10 outline-none"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
            />
          )}
        </div>

        <AnimatePresence>
          {percent != null && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-5">
              <div className="w-full bg-white/6 rounded-xl h-3 overflow-hidden">
                <div className="h-3 rounded-xl" style={{ width: `${percent}%`, background: 'linear-gradient(90deg,#61f3ff,#ff6ec7)' }} />
              </div>
              <p className="mt-2 text-xs text-gray-300">Uploading {percent}%</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6">
          <button
            onClick={startUploadAndAnalyze}
            disabled={loadingAnalysis}
            className="w-full py-3 rounded-xl bg-gradient-to-br from-accent1 to-accent2 text-black font-bold shadow-lg"
          >
            {loadingAnalysis ? 'Analyzing…' : 'Generate Insights'}
          </button>
        </div>
      </motion.div>

      <div className="text-xs text-gray-400 mt-3">Note: This uploader remains visually prominent until results are ready — then Results slide in on the right.</div>
    </motion.div>
  );
}  
