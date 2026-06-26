'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ScoreRing from './ScoreRing';

function getVerdict(score) {
  if (score >= 80) return 'Strong alignment';
  if (score >= 60) return 'Promising foundation';
  return 'Needs sharper proof';
}

function getCards(g) {
  return [
    {
      id: 'strengths',
      eyebrow: '01 / Working',
      title: 'Strengths',
      count: (g.skill_strengths || []).length,
      summary: 'Signals already supporting your application.',
      items: g.skill_strengths || [],
    },
    {
      id: 'gaps',
      eyebrow: '02 / Attention',
      title: 'Skill gaps',
      count: (g.skill_gaps || []).length,
      summary: 'Requirements that need stronger evidence.',
      items: g.skill_gaps || [],
    },
    {
      id: 'rewrites',
      eyebrow: '03 / Improve',
      title: 'Rewrites',
      count: (g.achievement_rewrites || []).length,
      summary: 'Copy-ready improvements for weak bullets.',
      items: g.achievement_rewrites || [],
      copyable: true,
    },
    {
      id: 'quality',
      eyebrow: '04 / Polish',
      title: 'Resume quality',
      count: (g.formatting_issues || []).length + (g.grammar_issues || []).length,
      summary: 'Formatting and grammar details to clean up.',
      items: [
        ...(g.formatting_issues || []).map((item) => `Formatting — ${item}`),
        ...(g.grammar_issues || []).map((item) => `Grammar — ${item}`),
      ],
    },
    {
      id: 'keywords',
      eyebrow: '05 / Match',
      title: 'Keywords',
      count: (g.keyword_alignment?.missing || []).length,
      summary: 'Role terms that are missing or weakly supported.',
      items: (g.keyword_alignment?.missing || []).map(
        (item) => `Show genuine evidence of ${item} in skills, projects, or experience.`
      ),
    },
  ];
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="outline-button shrink-0 rounded-lg px-3 py-1.5 text-xs"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function OrbitResults({ analysis, onRestart }) {
  const [activeCard, setActiveCard] = useState(null);

  const g = analysis?.gemini_analysis;
  const score = Number(g?.overall_match_score || 0);

  const cards = useMemo(() => getCards(g || {}), [g]);

  if (!g) return null;

  const active = cards.find((card) => card.id === activeCard);

  // Helper to render individual cards cleanly
  const renderCard = (card, index) => (
    <motion.button
      type="button"
      key={card.id}
      onClick={() => setActiveCard(card.id)}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.08 }}
      className="orbit-node flex h-full w-full flex-col rounded-2xl p-5 text-left transition-transform hover:scale-[1.02]"
    >
      <p className="text-[9px] uppercase tracking-[0.18em] text-[#d9ff5a]">
        {card.eyebrow}
      </p>
      <div className="mt-3 flex w-full items-start justify-between gap-2">
        {/* --- CHANGED: Added the arbitrary font family class here --- */}
        <h3 className="font-['Familjen_Grotesk'] text-2xl font-bold tracking-tight text-white">{card.title}</h3>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-[#aaa398]">
          {card.count}
        </span>
      </div>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-[#aaa398]">
        {card.summary}
      </p>
    </motion.button>
  );

  return (
    <section className="relative">
      {/* --- Google Font injection right inside your JSX --- */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Familjen+Grotesk:ital,wght@0,400..700;1,400..700&display=swap');
      `}} />

      <AnimatePresence mode="wait">
        {!active ? (
          <motion.div
            key="orbit-grid"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#d9ff5a]">
                Resume report / complete
              </p>
              {/* --- CHANGED: Applied font here --- */}
              <h2 className="font-['Familjen_Grotesk'] mt-3 text-4xl font-bold tracking-tight sm:text-6xl text-white">
                Your career, in focus.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#aaa398]">
                Explore each signal around your match index. Start with the areas
                that need the most attention.
              </p>
            </div>

            {/* --- DESKTOP GRID LAYOUT --- */}
            <div className="mx-auto mt-12 hidden max-w-4xl flex-col items-center gap-6 md:flex">
              
              {/* 1. Score Component (Top) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.6 }}
                className="dossier-card flex w-[320px] flex-col items-center justify-center rounded-[32px] p-8"
              >
                <ScoreRing value={score} size={172} />
                <p className="mt-3 text-sm font-medium text-[#d7d1c7]">{getVerdict(score)}</p>
                <p className="mt-2 text-center text-xs leading-relaxed text-[#777168]">
                  {g.final_recommendation}
                </p>
              </motion.div>

              {/* 2. Top 3 Metrics */}
              <div className="grid w-full grid-cols-3 gap-5">
                {cards.slice(0, 3).map((card, index) => renderCard(card, index))}
              </div>

              {/* 3. Bottom 2 Metrics (Centered) */}
              <div className="flex w-full justify-center gap-5">
                {cards.slice(3, 5).map((card, index) => (
                  <div className="w-[calc(33.333%-0.8rem)]" key={card.id}>
                    {renderCard(card, index + 3)}
                  </div>
                ))}
              </div>
            </div>

            {/* --- MOBILE LAYOUT --- */}
            <div className="mt-10 space-y-4 md:hidden">
              <div className="dossier-card rounded-[28px] p-6 text-center">
                <ScoreRing value={score} size={160} />
                <p className="mt-2 text-sm text-[#d7d1c7]">{getVerdict(score)}</p>
                <p className="mt-3 text-xs leading-relaxed text-[#777168]">
                  {g.final_recommendation}
                </p>
              </div>

              {cards.map((card, index) => renderCard(card, index))}
            </div>

            <div className="mt-12 text-center">
              <button
                type="button"
                onClick={onRestart}
                className="outline-button rounded-xl px-6 py-3 text-sm font-medium"
              >
                Analyze another resume
              </button>
            </div>
          </motion.div>
        ) : (
          /* --- DETAIL VIEW --- */
          <motion.div
            key={`detail-${active.id}`}
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.42 }}
            className="mx-auto max-w-3xl"
          >
            <div className="dossier-card rounded-[30px] p-6 sm:p-10">
              <button
                type="button"
                onClick={() => setActiveCard(null)}
                className="text-xs uppercase tracking-[0.16em] text-[#aaa398] transition hover:text-[#d9ff5a]"
              >
                ← Back to overview
              </button>

              <p className="mt-8 text-[10px] uppercase tracking-[0.22em] text-[#d9ff5a]">
                {active.eyebrow}
              </p>

              <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  {/* --- CHANGED: Applied font here --- */}
                  <h2 className="font-['Familjen_Grotesk'] text-5xl font-bold tracking-tight text-white">{active.title}</h2>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#aaa398]">
                    {active.summary}
                  </p>
                </div>

                <span className="text-sm text-[#aaa398]">
                  {active.count} item{active.count !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="mt-10 space-y-3">
                {active.items.length > 0 ? (
                  active.items.map((item, index) => (
                    <motion.div
                      key={`${active.id}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                    >
                      <div className="flex items-start gap-4">
                        {/* --- CHANGED: Applied font to numbers here too for styling symmetry --- */}
                        <span className="font-['Familjen_Grotesk'] text-2xl font-bold text-[#d9ff5a]">
                          0{index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed text-[#e4dfd6]">
                            {item}
                          </p>
                        </div>
                        {active.copyable && <CopyButton text={item} />}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-sm text-[#aaa398]">
                    No major issues were detected here. Focus on the other report
                    areas for the biggest improvement.
                  </div>
                )}
              </div>

              {active.id === 'keywords' && (
                <p className="mt-6 rounded-xl border border-[#d9ff5a]/15 bg-[#d9ff5a]/[0.05] p-4 text-xs leading-relaxed text-[#c9c3b9]">
                  Add a keyword only when you can honestly support it through a
                  project, internship, coursework, or certification.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
