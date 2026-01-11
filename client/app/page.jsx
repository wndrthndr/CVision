// File: app/resonance/page.jsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ResumeUploader from '../components/ResumeUploader';
import ResultsPanel from '../components/ResultsPanel';

export default function UploadPage() {
  const [resumeFile, setResumeFile] = React.useState(null);
  const [analysis, setAnalysis] = React.useState(null);
  const [percent, setPercent] = React.useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);

  // Called by ResumeUploader when upload+analysis completes
  function handleAnalysisResult(result) {
    setAnalysis(result);
    setPercent(null);
    setLoadingAnalysis(false);
  }

  // Variants used for subtle entrance / layout transitions
  const containerTransition = { type: 'spring', stiffness: 140, damping: 20 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c0e12] to-[#0b0d10] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <motion.h1
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="font-display text-[44px] md:text-[56px] font-bold"
          >
            AI Resume <span className="text-accent1">Intelligence</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="text-gray-400 mt-3 max-w-2xl mx-auto"
          >
          </motion.p>
        </header>

        {/* Grid: before analysis, uploader is centered by spanning the columns.
            After analysis, uploader moves to left col and results occupy right 2 cols. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <motion.div
            layout
            transition={containerTransition}
            className={!analysis ? 'lg:col-span-3 flex justify-center' : 'lg:col-span-1'}
          >
            <div style={{ width: !analysis ? '60%' : '100%' }} className="w-full">
              <ResumeUploader
                setResumeFile={setResumeFile}
                resumeFile={resumeFile}
                setPercent={setPercent}
                percent={percent}
                setLoadingAnalysis={setLoadingAnalysis}
                loadingAnalysis={loadingAnalysis}
                onResult={handleAnalysisResult}
              />
            </div>
          </motion.div>

          <div className="lg:col-span-2">
            <motion.div layout transition={containerTransition}>
              <ResultsPanel analysis={analysis} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
