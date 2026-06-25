'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function ScoreRing({ value = 0, size = 176 }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 72;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = (safeValue / 100) * circumference;
  const center = 88;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox="0 0 176 176">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(242,238,230,0.10)"
          strokeWidth={stroke}
        />

        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#d9ff5a"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          transform={`rotate(-90 ${center} ${center})`}
        />

        <circle
          cx={center}
          cy={center}
          r="58"
          fill="rgba(23,22,19,0.75)"
          stroke="rgba(242,238,230,0.08)"
        />
      </svg>

      <div className="absolute text-center">
        <p className="editorial-title text-5xl leading-none">{safeValue}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[#aaa398]">
          Match index
        </p>
      </div>
    </div>
  );
}
