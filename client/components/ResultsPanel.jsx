'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScoreRing from './ScoreRing';

export default function ResultsPanel({ analysis }) {
  const [openCards, setOpenCards] = useState([]); // Allow multiple open

  if (!analysis) {
    if (!analysis) {
      return (
        <div className="w-full flex justify-center items-center py-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel p-6 rounded-3xl border border-white/8 shadow-2xl text-center max-w-xl w-full"
          >
            <p className="text-gray-400">Results will appear here after analysis.</p>
          </motion.div>
        </div>
      );
    }
    
  }

  const g = analysis.gemini_analysis;

  // 6 cards for 2-2-2 symmetry
  const cards = [
    {
      key: 'strengths',
      title: 'Strengths',
      color: 'text-green-400',
      items: g.skill_strengths || [],
    },
    {
      key: 'gaps',
      title: 'Skill Gaps',
      color: 'text-red-400',
      items: g.skill_gaps || [],
    },
    {
      key: 'achievements',
      title: 'Achievement Rewrites',
      color: 'text-blue-300',
      items: g.achievement_rewrites || [],
    },
    {
      key: 'fmtgram',
      title: 'Formatting & Grammar',
      color: 'text-yellow-300',
      items: [
        `Formatting: ${(g.formatting_issues || ['None']).join(', ')}`,
        `Grammar: ${(g.grammar_issues || ['None']).join(', ')}`,
      ],
    },
    {
      key: 'suggestions',
      title: 'Suggestions',
      color: 'text-teal-300',
      items:
        g.suggestions ||
        [
          'Tailor your summary for the target role.',
          'Add metrics to top achievements.',
          'Include relevant job description keywords.',
        ],
    },
    {
      key: 'actions',
      title: 'Action Items',
      color: 'text-indigo-300',
      items:
        g.action_items ||
        [
          'Add a project section with links.',
          'Merge duplicate responsibilities.',
          'Fix punctuation and maintain consistency.',
        ],
    },
  ];

  // Toggle multiple card open states
  function toggleCard(key) {
    setOpenCards((prev) =>
      prev.includes(key)
        ? prev.filter((x) => x !== key)
        : [...prev, key]
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        className="space-y-6"
      >
        {/* Top Summary Card */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col lg:flex-row gap-6 items-center">
          <div className="w-full lg:w-44 flex-shrink-0 flex items-center justify-center">
            <ScoreRing value={g.overall_match_score ?? 0} />
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-semibold">Quick Highlights</h3>

            <div className="flex gap-3 flex-wrap mt-3">
              {(g.keyword_alignment?.matched || []).slice(0, 6).map((k, i) => (
                <div key={`m-${i}`} className="chip chip-green">
                  {k}
                </div>
              ))}
              {(g.keyword_alignment?.missing || []).slice(0, 4).map((k, i) => (
                <div key={`mm-${i}`} className="chip chip-red">
                  {k}
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-300 mt-3">
              {g.final_recommendation}
            </p>
          </div>
        </div>

        {/* 6-card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => {
            const isOpen = openCards.includes(card.key);

            return (
              <motion.div
                key={card.key}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 rounded-2xl border border-white/10 relative"
              >
                

                <div className="flex items-start justify-between mt-5">
                  <div>
                    <h4 className="font-semibold">{card.title}</h4>
                    {!isOpen && (
                      <p className="text-xs text-gray-400 mt-1">
                        {card.items.length} item(s)
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => toggleCard(card.key)}
                    className="px-3 py-2 rounded-lg text-sm bg-white/6 hover:bg-white/10"
                    aria-expanded={isOpen}
                  >
                    {isOpen ? 'Hide' : 'Expand'}
                  </button>
                </div>

                {/* Content */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 text-sm text-gray-300 leading-relaxed"
                    >
                      {card.items.length === 0 ? (
                        <div className="italic text-gray-500">
                          No items found.
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {card.items.map((it, i) => (
                            <li key={i}>• {it}</li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
