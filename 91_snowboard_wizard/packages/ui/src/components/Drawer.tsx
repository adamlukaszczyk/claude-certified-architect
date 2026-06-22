'use client'
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Drawer({ open, onClose, children }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[var(--radius-lg)] bg-[var(--color-surface)] border-t border-[var(--color-border)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
