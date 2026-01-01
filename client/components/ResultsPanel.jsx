'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScoreRing from './ScoreRing';

export default function ResultsNarrative({ analysis }) {
  const containerRef = useRef(null);
  const g = analysis.gemini_analysis;

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out', duration: 0.9 },
      });

      tl.from('.rn-section', {
        opacity: 0,
        y: 48,
        stagger: 0.18,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="space-y-28">
      {/* ================= SCORE HERO ================= */}
      <section className="rn-section editorial-card p-16 text-center">
        <p className="uppercase tracking-widest text-xs text-gray-500 mb-6">
          Overall match
        </p>

        <ScoreRing value={g.overall_match_score} />

        <p className="mt-8 text-gray-400 max-w-md mx-auto leading-relaxed">
          This score reflects how closely your resume aligns with the role
          across structure, keyword relevance, clarity, and impact.
        </p>
      </section>

      {/* ================= STRENGTHS ================= */}
      <NarrativeBlock
        index="01"
        title="What’s working well"
        description="Areas where your resume already demonstrates strength and alignment."
      >
        {g.skill_strengths.map((x, i) => (
          <NarrativeItem key={i}>{x}</NarrativeItem>
        ))}
      </NarrativeBlock>

      {/* ================= GAPS ================= */}
      <NarrativeBlock
        index="02"
        title="What’s holding you back"
        tone="warn"
        description="Gaps that may reduce your chances or confuse a recruiter."
      >
        {g.skill_gaps.map((x, i) => (
          <NarrativeItem key={i}>{x}</NarrativeItem>
        ))}
      </NarrativeBlock>

      {/* ================= REWRITES ================= */}
      <NarrativeBlock
        index="03"
        title="Suggested rewrites"
        tone="accent"
        description="Stronger phrasing focused on clarity, ownership, and measurable impact."
      >
        {g.achievement_rewrites.map((x, i) => (
          <NarrativeQuote key={i}>{x}</NarrativeQuote>
        ))}
      </NarrativeBlock>

      {/* ================= FINAL ================= */}
      <section className="rn-section editorial-card p-16">
        <p className="uppercase tracking-widest text-xs text-gray-500 mb-4">
          Final verdict
        </p>

        <h3 className="font-display text-2xl mb-6">
          Recommendation
        </h3>

        <p className="text-gray-300 leading-relaxed max-w-3xl">
          {g.final_recommendation}
        </p>
      </section>
    </div>
  );
}

/* ========================= */
/* SUB COMPONENTS            */
/* ========================= */

function NarrativeBlock({ index, title, description, tone, children }) {
  return (
    <section className="rn-section editorial-card p-16">
      <div className="flex items-start gap-8 mb-10">
        <div className="text-sm text-gray-500 font-mono">{index}</div>

        <div>
          <h3
            className={`font-display text-2xl mb-2 ${
              tone === 'warn'
                ? 'text-red-300'
                : tone === 'accent'
                ? 'text-accent1'
                : ''
            }`}
          >
            {title}
          </h3>

          {description && (
            <p className="text-gray-400 max-w-xl text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 text-gray-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function NarrativeItem({ children }) {
  return (
    <p className="flex gap-3">
      <span className="text-gray-500">—</span>
      <span>{children}</span>
    </p>
  );
}

function NarrativeQuote({ children }) {
  return (
    <blockquote className="pl-6 border-l border-white/10 italic text-gray-300">
      “{children}”
    </blockquote>
  );
}
