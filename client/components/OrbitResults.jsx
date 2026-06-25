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
      position: 'top',
    },
    {
      id: 'gaps',
      eyebrow: '02 / Attention',
      title: 'Skill gaps',
      count: (g.skill_gaps || []).length,
      summary: 'Requirements that need stronger evidence.',
      items: g.skill_gaps || [],
      position: 'right',
    },
    {
      id: 'rewrites',
      eyebrow: '03 / Improve',
      title: 'Rewrites',
      count: (g.achievement_rewrites || []).length,
      summary: 'Copy-ready improvements for weak bullets.',
      items: g.achievement_rewrites || [],
      position: 'bottomRight',
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
      position: 'bottomLeft',
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
      position: 'left',
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

  return (
    <section className="relative">
      <AnimatePresence mode="wait">
        {!active ? (
          <motion.div
            key="orbit"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#d9ff5a]">
                Resume report / complete
              </p>

              <h2 className="editorial-title mt-3 text-4xl sm:text-6xl">
                Your career, in focus.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#aaa398]">
                Explore each signal around your match index. Start with the areas
                that need the most attention.
              </p>
            </div>

            <div className="relative mx-auto mt-10 hidden h-[620px] max-w-5xl md:block">
              <div className="orbit-line absolute left-1/2 top-1/2 h-[430px] w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full" />

              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.6 }}
                className="dossier-card absolute left-1/2 top-1/2 z-10 flex h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full"
              >
                <ScoreRing value={score} size={172} />
                <p className="mt-1 text-sm text-[#d7d1c7]">{getVerdict(score)}</p>
                <p className="mt-2 max-w-[190px] text-center text-xs leading-relaxed text-[#777168]">
                  {g.final_recommendation}
                </p>
              </motion.div>

              {cards.map((card, index) => {
                const positions = {
                  top: 'left-1/2 top-0 -translate-x-1/2',
                  right: 'right-0 top-1/2 -translate-y-1/2',
                  bottomRight: 'bottom-0 right-[14%]',
                  bottomLeft: 'bottom-0 left-[14%]',
                  left: 'left-0 top-1/2 -translate-y-1/2',
                };

                return (
                  <motion.button
                    type="button"
                    key={card.id}
                    onClick={() => setActiveCard(card.id)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.08 }}
                    className={`orbit-node absolute z-20 w-[190px] rounded-2xl p-4 text-left ${positions[card.position]}`}
                  >
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[#d9ff5a]">
                      {card.eyebrow}
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-2">
                      <h3 className="editorial-title text-2xl">{card.title}</h3>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-[#aaa398]">
                        {card.count}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[#aaa398]">
                      {card.summary}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            {/* Mobile version */}
            <div className="mt-10 space-y-3 md:hidden">
              <div className="dossier-card rounded-[28px] p-6 text-center">
                <ScoreRing value={score} size={160} />
                <p className="mt-2 text-sm text-[#d7d1c7]">{getVerdict(score)}</p>
                <p className="mt-3 text-xs leading-relaxed text-[#777168]">
                  {g.final_recommendation}
                </p>
              </div>

              {cards.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  onClick={() => setActiveCard(card.id)}
                  className="orbit-node w-full rounded-2xl p-5 text-left"
                >
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#d9ff5a]">
                    {card.eyebrow}
                  </p>
                  <div className="mt-2 flex justify-between">
                    <h3 className="editorial-title text-2xl">{card.title}</h3>
                    <span className="text-sm text-[#aaa398]">{card.count}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#aaa398]">{card.summary}</p>
                </button>
              ))}
            </div>

            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={onRestart}
                className="outline-button rounded-xl px-5 py-3 text-sm"
              >
                Analyze another resume
              </button>
            </div>
          </motion.div>
        ) : (
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
                  <h2 className="editorial-title text-5xl">{active.title}</h2>
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
                        <span className="editorial-title text-2xl text-[#d9ff5a]">
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
