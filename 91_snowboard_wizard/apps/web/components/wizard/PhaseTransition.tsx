'use client'
import { useEffect, useRef } from 'react'

interface PhaseTransitionProps {
  onComplete: () => void
}

export function PhaseTransition({ onComplete }: PhaseTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (typeof window === 'undefined') return

    // Create 80 particle divs
    const particles: HTMLDivElement[] = []
    for (let i = 0; i < 80; i++) {
      const p = document.createElement('div')
      p.className = 'absolute h-2 w-2 rounded-full bg-[#F0F4FF]'
      p.style.left = '50%'
      p.style.top = '50%'
      container.appendChild(p)
      particles.push(p)
    }

    let tl: ReturnType<typeof import('gsap')['gsap']['timeline']> | null = null

    // Dynamically require gsap to gracefully handle environments where it may be unavailable
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const gsapModule = require('gsap') as typeof import('gsap')
      const gsap = gsapModule.gsap ?? gsapModule

      tl = gsap.timeline({ onComplete })
      tl.set(particles, { x: 0, y: 0, opacity: 1, scale: 0 })
      tl.to(particles, {
        x: () => (Math.random() - 0.5) * window.innerWidth * 1.5,
        y: () => (Math.random() - 0.5) * window.innerHeight * 1.5,
        scale: () => Math.random() * 2 + 0.5,
        opacity: 0,
        duration: 0.6,
        stagger: { each: 0.005, from: 'center' },
        ease: 'power2.out',
      })
    } catch {
      // GSAP unavailable (e.g. test environment) — just call onComplete after delay
      const timer = setTimeout(onComplete, 600)
      return () => {
        clearTimeout(timer)
        particles.forEach((p) => p.remove())
      }
    }

    const capturedTl = tl
    return () => {
      capturedTl?.kill()
      particles.forEach((p) => p.remove())
    }
  }, [onComplete])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
      aria-hidden
    />
  )
}
