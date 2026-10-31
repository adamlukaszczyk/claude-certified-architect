'use client'
import { motion } from 'framer-motion'
import { OptionButton } from './OptionButton'
import { NumericInput } from './NumericInput'
import { Button } from '@snowboard/ui'
import type { Question, OptionQuestion, NumericQuestion } from '@snowboard/wizard-schema'

interface QuestionCardProps {
  question: Question
  onAnswer: (questionId: string, value: string | number) => void
  onBack: () => void
}

export function QuestionCard({ question, onAnswer, onBack }: QuestionCardProps) {
  return (
    <motion.div
      key={question.id}
      initial={{ x: 60, rotateY: 5, opacity: 0 }}
      animate={{ x: 0, rotateY: 0, opacity: 1 }}
      exit={{ x: -60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <h2 className="mb-8 text-2xl font-semibold text-[var(--color-secondary)]">
          {question.text}
        </h2>

        {question.inputType === 'numeric' ? (
          <NumericInput
            question={question as NumericQuestion}
            onAnswer={onAnswer}
            onBack={onBack}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {(question as OptionQuestion).options.map((opt) => (
              <OptionButton
                key={opt.id}
                id={opt.id}
                text={opt.text}
                onSelect={(id) => onAnswer(question.id, id)}
              />
            ))}
            <Button variant="ghost" onClick={onBack} className="mt-4 self-start" aria-label="back">
              ← Back
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
