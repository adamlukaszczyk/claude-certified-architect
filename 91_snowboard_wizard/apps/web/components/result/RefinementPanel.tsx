'use client'
// RefinementPanel.tsx - Accordion of answered questions with inline editing and downstream pruning
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWizardStore } from '@/store/wizard-store'
import { ANSWER_KEY_MAP } from '@/lib/answer-key-map'
import { postScore } from '@/lib/api-client'
import type { Question } from '@snowboard/wizard-schema'
import type { Answers } from '@snowboard/types'

interface RefinementPanelProps {
  questions: Question[]
}

type OptionQuestion = Question & {
  options?: Array<{ id: string; text: string; weights: Record<string, unknown> }>
}

function getAnswerValue(answers: Answers, questionId: string): string | number | undefined {
  const key = ANSWER_KEY_MAP[questionId] ?? (questionId as keyof Answers)
  return answers[key] as string | number | undefined
}

export function RefinementPanel({ questions }: RefinementPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { answers, editAnswer, setScores } = useWizardStore()

  const answeredQuestions = questions.filter(
    (q) => getAnswerValue(answers, q.id) !== undefined
  )

  function handleEdit(questionId: string, value: string | number) {
    editAnswer(questionId, value, questions)
    postScore(useWizardStore.getState().answers).then(setScores).catch(() => {})
    setExpandedId(null)
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h3 className="mb-4 font-display text-sm tracking-wider uppercase text-[var(--color-muted)]">
        Refine Your Answers
      </h3>

      <div className="flex flex-col gap-2">
        {answeredQuestions.map((q) => {
          const current = getAnswerValue(answers, q.id)
          const isExpanded = expandedId === q.id
          const optQ = q as OptionQuestion
          const currentLabel = optQ.options?.find((o) => o.id === current)?.text ?? String(current)

          return (
            <div key={q.id} className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--color-primary)]/5 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
              >
                <span className="text-[var(--color-text)]">{q.text}</span>
                <span className="text-[var(--color-primary)] font-mono text-xs">{currentLabel}</span>
              </button>

              <AnimatePresence>
                {isExpanded && optQ.options && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 px-4 pb-4">
                      {optQ.options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleEdit(q.id, opt.id)}
                          className={`w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--color-primary)]/10 ${
                            opt.id === current
                              ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                              : 'text-[var(--color-muted)]'
                          }`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
