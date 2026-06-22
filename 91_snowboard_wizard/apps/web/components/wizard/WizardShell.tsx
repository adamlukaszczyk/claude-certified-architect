'use client'
import { useEffect, useMemo, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { rules } from '@snowboard/wizard-schema/rules'
import { useWizardStore } from '@/store/wizard-store'
import { postScore, postRecommendation, saveSession } from '@/lib/api-client'
import { getOrCreateSessionId } from '@/lib/session-id'
import { QuestionCard } from './QuestionCard'
import { ProgressTrail } from './ProgressTrail'
import { PhaseTransition } from './PhaseTransition'
import { LiveScoreSidebar } from './LiveScoreSidebar'
import type { Question } from '@snowboard/wizard-schema'

interface WizardShellProps {
  questions: Question[]
}

export function WizardShell({ questions }: WizardShellProps) {
  const router = useRouter()
  const [showTransition, setShowTransition] = useState(false)

  const {
    answers,
    currentPhase,
    currentQuestionIndex,
    phaseSizes,
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
        return fn ? fn(answers as Parameters<typeof fn>[0], undefined) : true
      }),
    [questions, currentPhase, answers]
  )

  useEffect(() => {
    setPhaseSize(currentPhase, visibleQuestions.length)
  }, [currentPhase, visibleQuestions.length, setPhaseSize])

  const totalAnswered = Object.values(phaseSizes).reduce((a, b) => a + b, 0)
  const totalQuestions = questions.length
  const progress = totalAnswered > 0 ? Math.min(1, totalAnswered / totalQuestions) : 0

  const currentQuestion = visibleQuestions[currentQuestionIndex] ?? null

  const handleAnswer = useCallback(
    async (questionId: string, value: string | number) => {
      answerQuestion(questionId, value)
      const sessionId = getOrCreateSessionId()
      const updatedAnswers = { ...answers, [questionId]: value }

      postScore(updatedAnswers).then(setScores).catch(() => {})
      saveSession(sessionId, updatedAnswers, currentPhase).catch(() => {})

      const isPhase3Last =
        currentPhase === 3 && currentQuestionIndex === visibleQuestions.length - 1
      const isPhaseLastQ = currentQuestionIndex === visibleQuestions.length - 1

      if (isPhase3Last) {
        setShowTransition(true)
        try {
          const rec = await postRecommendation(updatedAnswers)
          setRecommendation({
            id: rec.id,
            shareToken: rec.shareToken,
            specSheet: rec.specSheet,
            claudeNarrative: rec.claudeNarrative,
          })
          router.push(`/result/${rec.shareToken}`)
        } catch (err) {
          console.error('Failed to create recommendation', err)
          setShowTransition(false)
        }
      } else if (isPhaseLastQ) {
        setShowTransition(true)
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
      {showTransition && (
        <PhaseTransition onComplete={() => setShowTransition(false)} />
      )}

      <div className="mx-auto flex max-w-5xl gap-8">
        {/* Progress trail (left, desktop) */}
        <div className="hidden lg:flex flex-col items-center pt-4">
          <ProgressTrail progress={progress} />
        </div>

        {/* Question card */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              onAnswer={handleAnswer}
              onBack={goBack}
            />
          </AnimatePresence>
        </div>

        {/* Live score sidebar */}
        <LiveScoreSidebar />
      </div>
    </div>
  )
}
