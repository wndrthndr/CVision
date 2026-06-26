'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ResumeFlow from '../components/ResumeFlow';
import OrbitResults from '../components/OrbitResults';

export default function ResonancePage() {
  const [analysis, setAnalysis] = useState(null);

  function restart() {
    setAnalysis(null);

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-10 sm:px-8 md:px-12 lg:px-16">
      {/* --- Updated Font Import: Includes Andika & Familjen Grotesk --- */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Andika:ital,wght@0,400;0,700;1,400;1,700&family=Familjen+Grotesk:ital,wght@0,400..700;1,400..700&display=swap');
      `}} />

      <div className="grain" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#d9ff5a]">
              Resonance
            </p>
            <p className="mt-1 text-xs text-[#777168]">Resume intelligence studio</p>
          </div>

          <p className="hidden text-xs uppercase tracking-[0.16em] text-[#777168] sm:block">
            Private / role-specific / practical
          </p>
        </header>

        <AnimatePresence mode="wait">
          {!analysis ? (
            <motion.div
              key="flow"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <div className="mx-auto mb-12 max-w-3xl text-center">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#d9ff5a]">
                  Resume review, reimagined
                </p>

                {/* Heading: Familjen Grotesk */}
                <h1 className="font-['Familjen_Grotesk'] mt-4 text-5xl font-bold tracking-tight leading-[0.9] sm:text-7xl text-white">
                  Make your resume
                  <br />
                  harder to ignore.
                </h1>

                {/* Description: Andika */}
                <p className="font-['Andika'] mx-auto mt-6 max-w-xl text-sm leading-relaxed text-[#aaa398]">
                  Upload your PDF, choose where you want to go, and receive a
                  structured report designed to make your next move obvious.
                </p>
              </div>

              <ResumeFlow onResult={setAnalysis} />
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <OrbitResults analysis={analysis} onRestart={restart} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
