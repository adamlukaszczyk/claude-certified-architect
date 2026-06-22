'use client'
import { useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { rules } from '@snowboard/wizard-schema/rules'
import { useWizardStore } from '@/store/wizard-store'
import { postScore, postRecommendation } from '@/lib/api-client'
import { getOrCreateSessionId } from '@/lib/session-id'
import { saveSession } from '@/lib/api-client'
import { QuestionCard } from './QuestionCard'
import type { Question } from '@snowboard/wizard-schema'

interface WizardShellProps {
  questions: Question[]
}

export function WizardShell({ questions }: WizardShellProps) {
  const router = useRouter()
  const {
    answers,
    currentPhase,
    currentQuestionIndex,
    setScores,
    setPhaseSize,
    setRecommendation,
    answerQuestion,
    goBack,
  } = useWizardStore()

  const visibleQuestions = useMemo(
    () =>
      questions.filter((q) => {
        if (q.phase !== currentPhase) return false
        if (!q.showIf) return true
        const fn = rules[q.showIf as keyof typeof rules]
        return fn ? fn(answers, undefined) : true
      }),
    [questions, currentPhase, answers]
  )

  useEffect(() => {
    setPhaseSize(currentPhase, visibleQuestions.length)
  }, [currentPhase, visibleQuestions.length, setPhaseSize])

  const currentQuestion = visibleQuestions[currentQuestionIndex] ?? null

  const handleAnswer = useCallback(
    async (questionId: string, value: string | number) => {
      answerQuestion(questionId, value)
      const sessionId = getOrCreateSessionId()

      const updatedAnswers = { ...answers, [questionId]: value }

      // Fire-and-forget side effects
      postScore(updatedAnswers).then(setScores).catch(() => {})
      saveSession(sessionId, updatedAnswers as any, currentPhase).catch(() => {})

      // If last question of phase 3, create recommendation
      const isPhase3Last =
        currentPhase === 3 && currentQuestionIndex === visibleQuestions.length - 1
      if (isPhase3Last) {
        try {
          const rec = await postRecommendation(updatedAnswers as any)
          setRecommendation({
            id: rec.id,
            shareToken: rec.shareToken,
            specSheet: rec.specSheet,
            claudeNarrative: rec.claudeNarrative,
          })
          router.push(`/result/${rec.shareToken}`)
        } catch (err) {
          console.error('Failed to create recommendation', err)
        }
      }
    },
    [answers, currentPhase, currentQuestionIndex, visibleQuestions.length, answerQuestion, setScores, setRecommendation, router]
  )

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-muted)]">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <AnimatePresence mode="wait">
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            onAnswer={handleAnswer}
            onBack={goBack}
          />
        </AnimatePresence>
      </div>
    </div>
  )
}
