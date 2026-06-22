import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 ${className}`}
    >
      {children}
    </div>
  )
}
