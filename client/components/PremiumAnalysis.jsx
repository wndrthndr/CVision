"use client";

import { motion } from "framer-motion";
import ScoreRing from "./ScoreRing";

export default function PremiumAnalysis({ analysis }) {
  const a = analysis;
  const g = a.gemini_analysis;
  const local = a.subscores_computed_locally;

  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-10"
    >
      {/* LEFT SIDEBAR */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-8 shadow-2xl">
        <ScoreRing value={g.overall_match_score} />

        {/* Score Metrics */}
        <div className="space-y-3">
          {Object.entries(local).map(([k, v]) => (
            <div key={k} className="flex justify-between text-gray-300 text-sm">
              <span className="capitalize">{k}</span>
              <span className="font-semibold text-white">{v}%</span>
            </div>
          ))}
        </div>

        {/* Matched Skills */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Matched Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {g.keyword_alignment.matched.slice(0, 12).map((m, i) => (
              <span key={i} className="chip chip-green">
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Missing Skills */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Missing Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {g.keyword_alignment.missing.slice(0, 12).map((m, i) => (
              <span key={i} className="chip chip-red">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT MAIN PANEL */}
      <div className="lg:col-span-2 space-y-10">
        {/* Strengths */}
        <GlassSection title="Strengths" items={g.skill_strengths} />

        {/* Gaps */}
        <GlassSection title="Skill Gaps" items={g.skill_gaps} color="text-red-300" />

        {/* Achievement Rewrites */}
        <GlassSection title="Achievement Rewrites" items={g.achievement_rewrites} />

        {/* Formatting */}
        <GlassSection title="Formatting Issues" items={g.formatting_issues} color="text-yellow-300" />

        {/* Grammar */}
        <GlassSection title="Grammar Issues" items={g.grammar_issues} color="text-orange-300" />

        {/* Final Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 rounded-3xl border border-white/10 shadow-xl"
        >
          <h3 className="text-xl font-semibold mb-2">Final Recommendation</h3>
          <p className="text-gray-300">{g.final_recommendation}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

function GlassSection({ title, items, color = "text-gray-300" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-8 rounded-3xl border border-white/10 shadow-xl"
    >
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.map((x, i) => (
          <li key={i} className={`${color} text-sm leading-relaxed`}>
            • {x}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
