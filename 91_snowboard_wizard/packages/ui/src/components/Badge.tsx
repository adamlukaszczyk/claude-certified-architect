import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[var(--color-primary)] px-3 py-1 text-xs font-medium text-[var(--color-primary)] ${className}`}
    >
      {children}
    </span>
  )
}
