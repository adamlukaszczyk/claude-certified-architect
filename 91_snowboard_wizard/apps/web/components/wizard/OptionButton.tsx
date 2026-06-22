'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface OptionButtonProps {
  id: string
  text: string
  onSelect: (id: string) => void
}

export function OptionButton({ id, text, onSelect }: OptionButtonProps) {
  const [rippleKey, setRippleKey] = useState(0)
  const [showRipple, setShowRipple] = useState(false)

  function handleClick() {
    setRippleKey((k) => k + 1)
    setShowRipple(true)
    onSelect(id)
    setTimeout(() => {
      setShowRipple(false)
    }, 300)
  }

  return (
    <button
      onClick={handleClick}
      className="relative w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4 text-left text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
    >
      <span className="relative z-10 text-base">{text}</span>

      <AnimatePresence>
        {showRipple && (
          <motion.span
            key={rippleKey}
            className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--color-primary)]/20"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ transformOrigin: 'center' }}
          />
        )}
      </AnimatePresence>
    </button>
  )
}
