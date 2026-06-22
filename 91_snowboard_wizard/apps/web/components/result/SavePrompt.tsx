'use client'
// SavePrompt.tsx - Fixed bottom banner prompting guests to sign in and save their board profile
import { signIn, useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@snowboard/ui'
import { useWizardStore } from '@/store/wizard-store'
import { authenticateWithNestJs } from '@/app/actions'
import { getOrCreateSessionId } from '@/lib/session-id'

export function SavePrompt() {
  const { data: session } = useSession()
  const recommendation = useWizardStore((s) => s.recommendation)

  if (session?.user || !recommendation) return null

  async function handleSave() {
    const guestSessionId = getOrCreateSessionId()
    await signIn('google', { callbackUrl: `/result/${recommendation!.shareToken}?saved=1` })
    // After redirect back, exchange the Google token with NestJS and claim the guest session
    await authenticateWithNestJs(guestSessionId)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4"
      >
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-cta)]/30 bg-[var(--color-surface)] p-5 shadow-2xl shadow-[var(--color-cta)]/10">
          <p className="text-sm text-[var(--color-secondary)] font-semibold mb-1">
            Save your spec sheet
          </p>
          <p className="text-xs text-[var(--color-muted)] mb-4">
            Sign in to save, reload, and share your board profile.
          </p>
          <Button onClick={handleSave} className="w-full">
            Save with Google
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
