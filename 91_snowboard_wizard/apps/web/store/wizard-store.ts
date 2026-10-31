// wizard-store.ts - Zustand wizard state with localStorage persistence and 7-day expiry
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { rules } from '@snowboard/wizard-schema/rules'
import type { Answers, PartialScores, SpecSheet } from '@snowboard/types'
import type { Question } from '@snowboard/wizard-schema'
import { toAnswerKey } from '@/lib/answer-key-map'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

type StoredRecommendation = {
  id: string
  shareToken: string
  specSheet: SpecSheet
  claudeNarrative: string | null
}

type WizardState = {
  answers: Answers
  scores: PartialScores
  currentPhase: 1 | 2 | 3 | 4
  currentQuestionIndex: number
  phaseSizes: Record<number, number>
  recommendation: StoredRecommendation | null
  isRecalculating: boolean
  lastAnsweredAt: number | null

  answerQuestion: (questionId: string, value: string | number) => void
  editAnswer: (questionId: string, value: string | number, allQuestions: Question[]) => void
  setScores: (scores: PartialScores) => void
  setRecommendation: (rec: StoredRecommendation) => void
  setPhaseSize: (phase: number, size: number) => void
  setRecalculating: (v: boolean) => void
  resetWizard: () => void
  goBack: () => void
}

const initialState = {
  answers: {} as Answers,
  scores: {} as PartialScores,
  currentPhase: 1 as const,
  currentQuestionIndex: 0,
  phaseSizes: {} as Record<number, number>,
  recommendation: null,
  isRecalculating: false,
  lastAnsweredAt: null,
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      answerQuestion(questionId, value) {
        const { currentPhase, currentQuestionIndex, phaseSizes } = get()
        const key = toAnswerKey(questionId)
        const phaseSize = phaseSizes[currentPhase] ?? Infinity
        const isLastInPhase = currentQuestionIndex >= phaseSize - 1

        set((s) => ({
          answers: { ...s.answers, [key]: value },
          currentQuestionIndex: isLastInPhase ? 0 : s.currentQuestionIndex + 1,
          currentPhase: isLastInPhase
            ? Math.min(4, s.currentPhase + 1) as 1 | 2 | 3 | 4
            : s.currentPhase,
          lastAnsweredAt: Date.now(),
        }))
      },

      editAnswer(questionId, value, allQuestions) {
        const key = toAnswerKey(questionId)
        const updatedAnswers: Answers = { ...get().answers, [key]: value }

        // Prune downstream questions whose showIf condition no longer holds
        const changedIdx = allQuestions.findIndex((q) => q.id === questionId)
        for (let i = changedIdx + 1; i < allQuestions.length; i++) {
          const q = allQuestions[i]
          if (!q.showIf) continue
          const ruleFn = rules[q.showIf as keyof typeof rules]
          if (ruleFn && !ruleFn(updatedAnswers as Answers, undefined)) {
            const pruneKey = toAnswerKey(q.id)
            delete updatedAnswers[pruneKey]
          }
        }

        set({ answers: updatedAnswers, scores: {}, isRecalculating: true, lastAnsweredAt: Date.now() })
      },

      setScores(scores) {
        set({ scores, isRecalculating: false })
      },

      setRecommendation(rec) {
        set({ recommendation: rec })
      },

      setPhaseSize(phase, size) {
        set((s) => ({ phaseSizes: { ...s.phaseSizes, [phase]: size } }))
      },

      setRecalculating(v) {
        set({ isRecalculating: v })
      },

      resetWizard() {
        set({ ...initialState, phaseSizes: {} })
      },

      goBack() {
        const { currentQuestionIndex, currentPhase } = get()
        if (currentQuestionIndex > 0) {
          set({ currentQuestionIndex: currentQuestionIndex - 1 })
        } else if (currentPhase > 1) {
          const prevPhase = (currentPhase - 1) as 1 | 2 | 3 | 4
          const prevSize = get().phaseSizes[prevPhase] ?? 1
          set({ currentPhase: prevPhase, currentQuestionIndex: prevSize - 1 })
        }
      },
    }),
    {
      name: 'wizard-state',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const age = Date.now() - (state.lastAnsweredAt ?? 0)
        if (age > SEVEN_DAYS_MS) {
          state.resetWizard()
        }
      },
    }
  )
)
