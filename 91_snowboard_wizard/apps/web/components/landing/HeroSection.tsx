import Link from 'next/link'
import { Button } from '@snowboard/ui'

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <p className="text-[var(--color-primary)] text-sm tracking-[0.3em] uppercase mb-6">
        Precision Selection System
      </p>
      <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-none tracking-tight text-[var(--color-secondary)] mb-6">
        FIND YOUR
        <br />
        <span className="text-[var(--color-primary)]">PERFECT</span>
        <br />
        BOARD
      </h1>
      <p className="max-w-lg text-[var(--color-muted)] text-lg mb-10">
        Answer 15 questions. Get a personalised spec sheet built from 70+ selection factors — from flex to taper, camber to sidecut.
      </p>
      <Link href="/wizard">
        <Button className="text-lg px-10 py-4 font-display tracking-widest">
          START THE WIZARD
        </Button>
      </Link>
    </section>
  )
}
