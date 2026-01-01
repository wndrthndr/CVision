'use client';

import { useState } from 'react';
import ResumeUploader from '../components/ResumeUploader';
import ResultsNarrative from '../components/ResultsNarrative';

export default function ResonancePage() {
  const [analysis, setAnalysis] = useState(null);

  return (
    <div className="max-w-4xl mx-auto px-6 pt-36 pb-40">
      {/* HERO */}
      <section className="text-center">
        <h1 className="font-display text-5xl md:text-6xl leading-tight">
         AI  Resume intelligence,<br />
        </h1>

        <p className="text-gray-400 mt-6 max-w-xl mx-auto">
          Upload once. We analyze structure, skills, language, and intent —
          and return a focused, readable breakdown.
        </p>
      </section>

      {/* UPLOADER */}
      <section className="section-spacing">
        <ResumeUploader onResult={setAnalysis} />
      </section>

      {/* RESULTS */}
      {analysis && (
        <section className="section-spacing">
          <ResultsNarrative analysis={analysis} />
        </section>
      )}
    </div>
  );
}
