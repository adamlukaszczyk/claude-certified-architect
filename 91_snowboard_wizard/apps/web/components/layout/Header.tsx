import Link from 'next/link'
import { AuthButton } from './AuthButton'

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
      <Link href="/" className="font-display text-xl tracking-wider text-[var(--color-primary)]">
        SNOWBOARD WIZARD
      </Link>
      <AuthButton />
    </header>
  )
}
