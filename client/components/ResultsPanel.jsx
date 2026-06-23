'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScoreRing from './ScoreRing';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error('Could not copy text:', error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/15 border border-white/10 text-gray-200 transition"
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

function getVerdict(score) {
  if (score >= 80) {
    return {
      label: 'Strong Match',
      className: 'bg-green-400/10 text-green-300 border-green-400/20',
      description: 'Your resume is well aligned with this role.',
    };
  }

  if (score >= 60) {
    return {
      label: 'Moderate Match',
      className: 'bg-yellow-400/10 text-yellow-200 border-yellow-400/20',
      description: 'You have a good base, but targeted improvements can raise your match.',
    };
  }

  return {
    label: 'Needs Improvement',
    className: 'bg-red-400/10 text-red-300 border-red-400/20',
    description: 'Focus on role-specific keywords, stronger achievements, and clearer positioning.',
  };
}

function ScoreMetric({ label, value }) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
      <p className="text-xs text-gray-400">{label}</p>

      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-lg font-semibold text-white">{safeValue}</p>
        <p className="text-xs text-gray-500">/100</p>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent1 to-accent2 transition-all duration-700"
          style={{ width: `${Math.max(0, Math.min(100, safeValue))}%` }}
        />
      </div>
    </div>
  );
}

export default function ResultsPanel({ analysis }) {
  const [openCards, setOpenCards] = useState([]);

  if (!analysis?.gemini_analysis) {
    return null;
  }

  const g = analysis.gemini_analysis;
  const subscores = analysis.subscores_computed_locally || {};

  const score = Number(g.overall_match_score ?? 0);
  const verdict = getVerdict(score);

  const matchedKeywords = g.keyword_alignment?.matched || [];
  const missingKeywords = g.keyword_alignment?.missing || [];

  const priorities = [
    ...missingKeywords
      .slice(0, 2)
      .map((skill) => `Add or demonstrate ${skill} where it is genuinely relevant.`),

    ...(g.achievement_rewrites || [])
      .slice(0, 1)
      .map(() => 'Replace at least one weak responsibility bullet with a measurable achievement.'),

    ...(g.formatting_issues || [])
      .slice(0, 1)
      .map((issue) => `Fix this formatting issue: ${issue}`),
  ].slice(0, 3);

  const cards = [
    {
      key: 'strengths',
      title: 'Strengths',
      subtitle: 'What already supports your application',
      color: 'text-green-300',
      dot: 'bg-green-400',
      type: 'standard',
      items: g.skill_strengths || [],
    },
    {
      key: 'gaps',
      title: 'Skill Gaps',
      subtitle: 'Areas to strengthen for this role',
      color: 'text-red-300',
      dot: 'bg-red-400',
      type: 'standard',
      items: g.skill_gaps || missingKeywords || [],
    },
    {
      key: 'achievements',
      title: 'Achievement Rewrites',
      subtitle: 'Copy-ready bullet improvements',
      color: 'text-blue-300',
      dot: 'bg-blue-400',
      type: 'copyable',
      items: g.achievement_rewrites || [],
    },
    {
      key: 'fmtgram',
      title: 'Formatting & Grammar',
      subtitle: 'Presentation issues recruiters may notice',
      color: 'text-yellow-200',
      dot: 'bg-yellow-300',
      type: 'standard',
      items: [
        ...(g.formatting_issues || []).map((item) => `Formatting: ${item}`),
        ...(g.grammar_issues || []).map((item) => `Grammar: ${item}`),
      ],
    },
    {
      key: 'keyword-focus',
      title: 'Keyword Focus',
      subtitle: 'Keywords to include where truthful',
      color: 'text-teal-200',
      dot: 'bg-teal-300',
      type: 'standard',
      items: missingKeywords.map(
        (skill) => `Show evidence of ${skill} in skills, projects, coursework, or experience.`
      ),
    },
    {
      key: 'next-actions',
      title: 'Next Actions',
      subtitle: 'Best steps to improve your score',
      color: 'text-indigo-200',
      dot: 'bg-indigo-300',
      type: 'standard',
      items: [
        ...(g.final_recommendation ? [g.final_recommendation] : []),
        ...priorities,
      ],
    },
  ];

  function toggleCard(key) {
    setOpenCards((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key]
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.45 }}
        className="space-y-6"
      >
        {/* ================================================= */}
        {/* SCORE SUMMARY                                     */}
        {/* ================================================= */}
        <div className="glass-panel rounded-3xl border border-white/10 p-6 shadow-2xl">
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
            <div className="w-full shrink-0 lg:w-44">
              <ScoreRing value={score} />
            </div>

            <div className="flex-1 text-center lg:text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-accent1">
                Resume Analysis Complete
              </p>

              <h3 className="mt-2 text-2xl font-semibold">
                Your Resume Match Overview
              </h3>

              <div
                className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${verdict.className}`}
              >
                {verdict.label}
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">
                {g.final_recommendation || verdict.description}
              </p>

              <div className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                  Matched Keywords
                </p>

                <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                  {matchedKeywords.length > 0 ? (
                    matchedKeywords.slice(0, 6).map((keyword, index) => (
                      <span key={`matched-${index}`} className="chip chip-green">
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">
                      No strong keyword matches found yet.
                    </span>
                  )}
                </div>
              </div>

              {missingKeywords.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                    Missing Keywords
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                    {missingKeywords.slice(0, 5).map((keyword, index) => (
                      <span key={`missing-${index}`} className="chip chip-red">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Score breakdown */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <ScoreMetric label="Keywords" value={subscores.keyword} />
            <ScoreMetric label="Experience" value={subscores.experience} />
            <ScoreMetric label="Achievements" value={subscores.achievements} />
            <ScoreMetric label="Formatting" value={subscores.formatting} />
            <ScoreMetric label="Grammar" value={subscores.grammar} />
          </div>
        </div>

        {/* ================================================= */}
        {/* TOP PRIORITIES                                    */}
        {/* ================================================= */}
        <div className="glass-panel rounded-3xl border border-white/10 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-accent1">
            Highest Impact Fixes
          </p>

          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h3 className="text-xl font-semibold">Improve these first</h3>
              <p className="mt-1 text-sm text-gray-400">
                These changes are most likely to improve your role match.
              </p>
            </div>

            <span className="text-xs text-gray-500">
              {priorities.length} priority item{priorities.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {priorities.length > 0 ? (
              priorities.map((priority, index) => (
                <motion.div
                  key={`priority-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="flex gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent1 to-accent2 text-sm font-bold text-black">
                    {index + 1}
                  </span>

                  <p className="pt-0.5 text-sm leading-relaxed text-gray-200">
                    {priority}
                  </p>
                </motion.div>
              ))
            ) : (
              <p className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-4 text-sm text-gray-400">
                Your resume is already in good shape. Focus on tailoring it to each job description.
              </p>
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* INSIGHT CARDS                                     */}
        {/* ================================================= */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {cards.map((card, index) => {
            const isOpen = openCards.includes(card.key);
            const previewItems = card.items.slice(0, 2);
            const visibleItems = isOpen ? card.items : previewItems;
            const hasMoreItems = card.items.length > 2;

            return (
              <motion.div
                key={card.key}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="glass-panel rounded-2xl border border-white/10 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${card.dot}`}
                    />

                    <div>
                      <h4 className={`font-semibold ${card.color}`}>
                        {card.title}
                      </h4>

                      <p className="mt-1 text-xs text-gray-500">
                        {card.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-gray-400">
                    {card.items.length}
                  </span>
                </div>

                <AnimatePresence initial={false}>
                  <motion.div
                    key={isOpen ? 'open' : 'preview'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-5 space-y-3"
                  >
                    {visibleItems.length === 0 ? (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 text-sm italic text-gray-500">
                        No items found.
                      </div>
                    ) : (
                      visibleItems.map((item, itemIndex) => (
                        <div
                          key={`${card.key}-${itemIndex}`}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4"
                        >
                          {card.type === 'copyable' ? (
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm leading-relaxed text-gray-200">
                                {item}
                              </p>

                              <CopyButton text={item} />
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed text-gray-300">
                              <span className="mr-2 text-accent1">•</span>
                              {item}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </motion.div>
                </AnimatePresence>

                {hasMoreItems && (
                  <button
                    type="button"
                    onClick={() => toggleCard(card.key)}
                    className="mt-4 text-sm font-medium text-accent1 transition hover:opacity-75"
                    aria-expanded={isOpen}
                  >
                    {isOpen
                      ? 'Show less'
                      : `Show all ${card.items.length} items`}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* ================================================= */}
        {/* BOTTOM ACTION                                     */}
        {/* ================================================= */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-center">
          <h3 className="text-lg font-semibold">Want a stronger result?</h3>

          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">
            Update your resume using the priority fixes, then analyze it again against the same job description.
          </p>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mt-5 rounded-xl bg-gradient-to-br from-accent1 to-accent2 px-5 py-3 text-sm font-bold text-black shadow-lg transition hover:scale-[1.02]"
          >
            Analyze Another Role
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
