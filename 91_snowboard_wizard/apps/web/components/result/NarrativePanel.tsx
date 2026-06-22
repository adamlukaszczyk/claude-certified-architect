'use client'
import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface NarrativePanelProps {
  narrative: string | null
}

export function NarrativePanel({ narrative }: NarrativePanelProps) {
  const words = useMemo(
    () => (narrative ? narrative.split(/(\s+)/) : []),
    [narrative]
  )

  if (!narrative) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-muted)] text-sm">
        Narrative analysis is being generated…
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="mb-6 font-display text-xl tracking-wider text-[var(--color-secondary)]">
        WHY THESE SPECS
      </h2>

      <p className="text-[var(--color-text)] leading-relaxed text-sm">
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.015 }}
          >
            {word}
          </motion.span>
        ))}
      </p>
    </div>
  )
}
