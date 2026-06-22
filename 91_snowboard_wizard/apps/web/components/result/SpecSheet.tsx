'use client'
import { motion } from 'framer-motion'
import type { SpecSheet as SpecSheetType } from '@snowboard/types'

interface SpecSheetProps {
  spec: SpecSheetType
}

type SpecRow = { label: string; value: string }

function specRows(spec: SpecSheetType): SpecRow[] {
  return [
    { label: 'Board Length', value: `${spec.lengthCm} cm` },
    { label: 'Waist Width', value: `${spec.waistWidthMm} mm` },
    { label: 'Flex Rating', value: `${spec.flexRating}/10` },
    { label: 'Flex Feel', value: spec.flexLabel },
    { label: 'Shape', value: spec.shape },
    { label: 'Camber Profile', value: spec.camberProfile },
    { label: 'Taper', value: `${spec.taperMm} mm` },
    { label: 'Sidecut Radius', value: spec.sidecutRadius },
    { label: 'Setback', value: spec.setback },
    { label: 'Base Type', value: spec.baseType },
    { label: 'Float Priority', value: spec.floatPriority },
  ]
}

export function SpecSheet({ spec }: SpecSheetProps) {
  const rows = specRows(spec)

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="mb-6 font-display text-xl tracking-wider text-[var(--color-primary)]">
        YOUR SPEC SHEET
      </h2>

      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <motion.div
            key={row.label}
            className="flex items-center justify-between border-b border-[var(--color-border)] pb-2"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
            style={{ transformOrigin: 'left' }}
          >
            <span className="text-sm text-[var(--color-muted)]">{row.label}</span>
            <span className="font-mono text-sm text-[var(--color-secondary)]">{row.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
