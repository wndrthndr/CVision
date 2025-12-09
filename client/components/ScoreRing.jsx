'use client';
import React from 'react';
import { motion } from 'framer-motion';

export default function ScoreRing({ value }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120">
        <circle cx="60" cy="60" r={radius} stroke="#2a2d33" strokeWidth="10" fill="none" />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          stroke="url(#grad)"
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="grad" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#61f3ff" />
            <stop offset="100%" stopColor="#ff6ec7" />
          </linearGradient>
        </defs>
      </svg>

      <p className="text-2xl font-bold mt-2">{value}%</p>
      <p className="text-gray-400 text-xs">Overall Match</p>
    </div>
  );
}
