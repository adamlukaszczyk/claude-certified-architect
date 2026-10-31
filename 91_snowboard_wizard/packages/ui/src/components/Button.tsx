import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: React.ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-[var(--color-cta)] text-[var(--color-bg)] hover:opacity-90',
  secondary: 'bg-[var(--color-surface)] text-[var(--color-primary)] border border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10',
  ghost: 'bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]',
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[var(--radius-md)] px-6 py-3 font-semibold transition-all duration-150 disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
