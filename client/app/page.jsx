'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import ResumeUploader from '../components/ResumeUploader';
import ResultsNarrative from '../components/ResultsPanel';

export default function ResonancePage() {
  const [analysis, setAnalysis] = useState(null);
  const pageRef = useRef(null);

  /* Page intro choreography */
  useEffect(() => {
    gsap.fromTo(
      pageRef.current.children,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.15,
        duration: 1,
        ease: 'power3.out',
      }
    );
  }, []);

  return (
    <main
      ref={pageRef}
      className="relative min-h-screen flex flex-col items-center text-white"
    >
      {/* ============================= */}
      {/* HERO + UPLOAD (Single Section) */}
      {/* ============================= */}
      <section className="w-full min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-3xl w-full text-center">
          <h1 className="font-display text-5xl md:text-6xl leading-tight">
            AI Resume intelligence
          </h1>

          <p className="text-gray-400 mt-6 max-w-xl mx-auto">
            Upload once. We analyze structure, skills, language, and intent —
            and return a focused, readable breakdown.
          </p>

          {/* Upload sits inside hero — intentional */}
          <div className="mt-16">
            <ResumeUploader onResult={setAnalysis} />
          </div>
        </div>
      </section>

      {/* ============================= */}
      {/* SOFT DIVIDER */}
      {/* ============================= */}
      {analysis && (
        <div className="w-full flex justify-center">
          <div className="w-[1px] h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        </div>
      )}

      {/* ============================= */}
      {/* RESULTS STORY */}
      {/* ============================= */}
      {analysis && (
        <section className="w-full px-6 pb-40">
          <div className="max-w-4xl mx-auto">
            <ResultsNarrative analysis={analysis} />
          </div>
        </section>
      )}
    </main>
  );
}
