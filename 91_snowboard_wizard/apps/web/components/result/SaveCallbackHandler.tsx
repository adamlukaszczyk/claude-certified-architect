'use client'
// SaveCallbackHandler.tsx - Handles post-OAuth save callback by exchanging Google token with NestJS
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authenticateWithNestJs } from '@/app/actions'
import { getOrCreateSessionId } from '@/lib/session-id'

export function SaveCallbackHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get('saved') !== '1') return
    const guestSessionId = getOrCreateSessionId()
    authenticateWithNestJs(guestSessionId).finally(() => {
      router.replace(window.location.pathname, { scroll: false })
    })
  }, [searchParams, router])

  return null
}
