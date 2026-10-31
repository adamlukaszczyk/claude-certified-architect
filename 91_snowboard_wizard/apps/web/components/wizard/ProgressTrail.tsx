'use client'
import { motion } from 'framer-motion'

interface ProgressTrailProps {
  progress: number // 0–1
}

// SVG path approximating a serpentine mountain descent
const TRAIL_PATH = 'M 10,10 C 30,30 70,30 90,50 C 110,70 50,90 70,110 C 90,130 130,130 150,150'
const TRAIL_LENGTH = 200

export function ProgressTrail({ progress }: ProgressTrailProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="32" height="160" viewBox="0 0 160 160" className="opacity-40">
        <path d={TRAIL_PATH} stroke="var(--color-border)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <motion.path
          d={TRAIL_PATH}
          stroke="var(--color-primary)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={TRAIL_LENGTH}
          animate={{ strokeDashoffset: TRAIL_LENGTH * (1 - progress) }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <span className="font-mono text-xs text-[var(--color-muted)]">
        {Math.round(progress * 100)}%
      </span>
    </div>
  )
}
