'use client'
import { useState } from 'react'
import { Button } from '@snowboard/ui'
import type { NumericQuestion } from '@snowboard/wizard-schema'

interface NumericInputProps {
  question: NumericQuestion
  onAnswer: (questionId: string, value: number) => void
  onBack: () => void
}

export function NumericInput({ question, onAnswer, onBack }: NumericInputProps) {
  const [value, setValue] = useState<string>('')

  function handleSubmit() {
    const num = parseFloat(value)
    if (isNaN(num)) return
    if (question.min !== undefined && num < question.min) return
    if (question.max !== undefined && num > question.max) return
    onAnswer(question.id, num)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min={question.min}
          max={question.max}
          placeholder={`Enter ${question.unit ?? 'value'}`}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] text-lg focus:border-[var(--color-primary)] focus:outline-none"
        />
        {question.unit && (
          <span className="font-mono text-[var(--color-muted)]">{question.unit}</span>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} aria-label="back">← Back</Button>
        <Button onClick={handleSubmit} disabled={!value}>Continue</Button>
      </div>
    </div>
  )
}
