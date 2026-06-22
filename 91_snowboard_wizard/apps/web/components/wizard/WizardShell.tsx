'use client'
import { useEffect, useMemo, useCallback, useState, useRef } from 'react'
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
import type { Answers } from '@snowboard/types'

interface WizardShellProps {
  questions: Question[]
}

export function WizardShell({ questions }: WizardShellProps) {
  const router = useRouter()
  const [showTransition, setShowTransition] = useState(false)
  // Sequence guard: drop stale postScore responses that arrive out-of-order
  const scoreSeqRef = useRef(0)

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

  // Progress: answered question count / total questions
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length
  const progress = totalQuestions > 0 ? Math.min(1, answeredCount / totalQuestions) : 0

  const currentQuestion = visibleQuestions[currentQuestionIndex] ?? null

  const handleAnswer = useCallback(
    async (questionId: string, value: string | number) => {
      answerQuestion(questionId, value)
      const sessionId = getOrCreateSessionId()
      const updatedAnswers = { ...answers, [questionId]: value }

      // Fire-and-forget score update with sequence guard to drop stale responses
      const seq = ++scoreSeqRef.current
      postScore(updatedAnswers).then((scores) => {
        if (seq === scoreSeqRef.current) setScores(scores)
      }).catch(() => {})

      saveSession(sessionId, updatedAnswers, currentPhase).catch((err) =>
        console.error('saveSession failed', err)
      )

      // Recompute phase-3 visibility against updatedAnswers to avoid stale showIf checks
      const updatedPhase3Questions = questions.filter(
        (q) =>
          q.phase === 3 &&
          (!q.showIf || (rules[q.showIf as keyof typeof rules]?.(updatedAnswers as Answers, undefined) ?? true))
      )
      const isPhase3Last =
        currentPhase === 3 &&
        updatedPhase3Questions.every((q) => updatedAnswers[q.id as keyof typeof updatedAnswers] !== undefined)
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
    [answers, currentPhase, currentQuestionIndex, visibleQuestions.length, questions, answerQuestion, setScores, setRecommendation, router]
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
