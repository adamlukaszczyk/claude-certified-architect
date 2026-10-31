'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Drawer } from '@snowboard/ui'
import { useWizardStore } from '@/store/wizard-store'
import type { PartialScores } from '@snowboard/types'

const SCORE_LABELS: Record<keyof PartialScores, string> = {
  length: 'Board Length',
  width: 'Waist Width',
  flex: 'Flex Rating',
  shape: 'Shape',
  camber: 'Camber',
  taper: 'Taper',
  sidecut: 'Sidecut',
  setback: 'Setback',
  base: 'Base Type',
  float: 'Float Priority',
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1">
        <span>{label}</span>
        <motion.span
          key={value}
          className="font-mono text-[var(--color-primary)]"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {value.toFixed(1)}
        </motion.span>
      </div>
      <div className="h-1 rounded-full bg-[var(--color-border)]">
        <motion.div
          className="h-1 rounded-full bg-[var(--color-primary)]"
          animate={{ width: `${Math.min(100, Math.max(0, (value / 15) * 100))}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      </div>
    </div>
  )
}

function ScoreContent() {
  const { scores, isRecalculating } = useWizardStore()
  const keys = Object.keys(scores) as (keyof PartialScores)[]

  if (keys.length === 0) {
    return (
      <p className="text-xs text-[var(--color-muted)] text-center py-4">
        Answer questions to see your live profile build up here.
      </p>
    )
  }

  return (
    <div className="relative">
      {isRecalculating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface)]/80 rounded-[var(--radius-md)]">
          <span className="text-xs text-[var(--color-primary)] animate-pulse">Recalculating…</span>
        </div>
      )}
      {keys.map((key) => (
        <ScoreBar key={key} label={SCORE_LABELS[key] ?? key} value={scores[key] ?? 0} />
      ))}
    </div>
  )
}

export function LiveScoreSidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-4 text-xs font-semibold tracking-widest uppercase text-[var(--color-muted)]">
            Live Profile
          </h3>
          <ScoreContent />
        </div>
      </aside>

      {/* Mobile bottom drawer trigger */}
      <button
        className="fixed bottom-4 right-4 z-40 lg:hidden rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-bg)]"
        onClick={() => setDrawerOpen(true)}
      >
        Live Profile
      </button>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          <h3 className="mb-4 text-xs font-semibold tracking-widest uppercase text-[var(--color-muted)]">
            Live Profile
          </h3>
          <ScoreContent />
        </div>
      </Drawer>
    </>
  )
}
