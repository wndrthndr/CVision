'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScoreRing from './ScoreRing';

export default function ResultsNarrative({ analysis }) {
  const ref = useRef(null);
  const g = analysis.gemini_analysis;

  useEffect(() => {
    gsap.fromTo(
      ref.current.children,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.12,
        duration: 1,
        ease: 'power3.out',
      }
    );
  }, []);

  return (
    <div ref={ref} className="space-y-20">
      {/* SCORE */}
      <div className="editorial-card p-14 flex flex-col items-center">
        <ScoreRing value={g.overall_match_score} />
        <p className="mt-6 text-gray-400 text-center max-w-md">
          This score reflects how well your resume aligns with the provided role
          in structure, keywords, clarity, and impact.
        </p>
      </div>

      {/* STRENGTHS */}
      <NarrativeBlock title="What’s working well">
        {g.skill_strengths.map((x, i) => (
          <p key={i}>— {x}</p>
        ))}
      </NarrativeBlock>

      {/* GAPS */}
      <NarrativeBlock title="What’s holding you back" tone="warn">
        {g.skill_gaps.map((x, i) => (
          <p key={i}>— {x}</p>
        ))}
      </NarrativeBlock>

      {/* REWRITES */}
      <NarrativeBlock title="Suggested rewrites" tone="accent">
        {g.achievement_rewrites.map((x, i) => (
          <p key={i}>“{x}”</p>
        ))}
      </NarrativeBlock>

      {/* FINAL */}
      <div className="editorial-card p-14">
        <h3 className="font-display text-2xl mb-4">Final Recommendation</h3>
        <p className="text-gray-300 leading-relaxed">
          {g.final_recommendation}
        </p>
      </div>
    </div>
  );
}

function NarrativeBlock({ title, children, tone }) {
  return (
    <div className="editorial-card p-14">
      <h3
        className={`font-display text-2xl mb-6 ${
          tone === 'warn'
            ? 'text-red-300'
            : tone === 'accent'
            ? 'text-accent1'
            : ''
        }`}
      >
        {title}
      </h3>
      <div className="space-y-4 text-gray-300 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
