'use client';

import React from 'react';
import { motion } from 'framer-motion';

const STAGES = [
  'Reading document structure',
  'Extracting skills and projects',
  'Matching target requirements',
  'Preparing your report',
];

export default function DocumentScanner({ percent = 0, message = '' }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const activeStage =
    safePercent < 28 ? 0 : safePercent < 55 ? 1 : safePercent < 82 ? 2 : 3;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="dossier-card rounded-[28px] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#d9ff5a]">
              Resume dossier / processing
            </p>
            <h2 className="editorial-title mt-2 text-3xl sm:text-4xl">
              Building your report.
            </h2>
          </div>

          <p className="editorial-title text-3xl text-[#d9ff5a]">
            {Math.round(safePercent)}%
          </p>
        </div>

        <div className="relative mx-auto mt-8 h-[270px] max-w-[310px]">
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
            className="absolute inset-6 rounded-[28px] border border-[#d9ff5a]/20"
          />

          <div className="absolute inset-0 rounded-md border border-[#f2eee6]/20 bg-[#e9e1d4] p-6 text-[#26231e] shadow-2xl">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#625c53]">
              Candidate profile
            </p>

            <div className="mt-6 space-y-3">
              <div className="h-2 w-3/4 rounded bg-[#575148]/70" />
              <div className="h-1.5 w-full rounded bg-[#80796e]/45" />
              <div className="h-1.5 w-5/6 rounded bg-[#80796e]/45" />

              <div className="mt-6 h-px bg-[#80796e]/30" />

              <div className="space-y-2 pt-2">
                <div className="h-1.5 w-full rounded bg-[#80796e]/45" />
                <div className="h-1.5 w-11/12 rounded bg-[#80796e]/45" />
                <div className="h-1.5 w-4/5 rounded bg-[#80796e]/45" />
              </div>
            </div>

            <motion.div
              className="absolute left-0 right-0 h-[2px] bg-[#b4d845] shadow-[0_0_20px_rgba(180,216,69,0.9)]"
              animate={{ top: ['12%', '88%', '12%'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>

        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-[#d9ff5a]"
            animate={{ width: `${safePercent}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>

        <p className="mt-3 text-sm text-[#d7d1c7]">
          {message || 'Reading your resume...'}
        </p>

        <div className="mt-7 space-y-3">
          {STAGES.map((stage, index) => {
            const complete = index < activeStage;
            const current = index === activeStage;

            return (
              <div
                key={stage}
                className={`flex items-center gap-3 text-sm ${
                  index > activeStage ? 'opacity-35' : 'opacity-100'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    complete
                      ? 'bg-[#a7e79b]/20 text-[#a7e79b]'
                      : current
                        ? 'bg-[#d9ff5a] text-[#171613]'
                        : 'bg-white/10 text-[#aaa398]'
                  }`}
                >
                  {complete ? '✓' : current ? '•' : index + 1}
                </span>

                <span className={current ? 'text-[#f2eee6]' : 'text-[#aaa398]'}>
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
