import { act, renderHook } from '@testing-library/react'
import { useWizardStore } from '@/store/wizard-store'

// Reset store between tests
beforeEach(() => {
  useWizardStore.getState().resetWizard()
})

describe('answerQuestion', () => {
  it('stores the answer and advances questionIndex', () => {
    const { result } = renderHook(() => useWizardStore())
    act(() => {
      result.current.answerQuestion('height_category', 'h_171_180')
    })
    expect(result.current.answers.heightCategory).toBe('h_171_180')
    expect(result.current.currentQuestionIndex).toBe(1)
  })

  it('advances phase when questionIndex exceeds phaseSize', () => {
    const { result } = renderHook(() => useWizardStore())
    act(() => {
      result.current.setPhaseSize(1, 2)
      result.current.answerQuestion('height_category', 'h_171_180')
      result.current.answerQuestion('weight_category', 'w_71_85')
    })
    expect(result.current.currentPhase).toBe(2)
    expect(result.current.currentQuestionIndex).toBe(0)
  })
})

describe('editAnswer', () => {
  it('updates an existing answer', () => {
    const { result } = renderHook(() => useWizardStore())
    act(() => {
      result.current.answerQuestion('height_category', 'h_171_180')
      result.current.editAnswer('height_category', 'over_190', [])
    })
    expect(result.current.answers.heightCategory).toBe('over_190')
  })

  it('prunes downstream answers when showIf rule no longer holds', () => {
    const { result } = renderHook(() => useWizardStore())

    // Simulate: style = powder (isPowderFocused = true), then taper answer recorded
    act(() => {
      result.current.answerQuestion('style', 'powder')
      result.current.answerQuestion('taper_preference', 'high_taper')
    })

    // Change style to freestyle — isPowderFocused becomes false → taper_preference should be pruned
    const mockQuestions = [
      { id: 'style', phase: 2, text: 'Style?', options: [] },
      { id: 'taper_preference', phase: 3, text: 'Taper?', showIf: 'isPowderFocused', options: [] },
    ]
    act(() => {
      result.current.editAnswer('style', 'freestyle', mockQuestions as any)
    })

    expect(result.current.answers.taperPreference).toBeUndefined()
  })
})

describe('resetWizard', () => {
  it('clears all answers and resets to phase 1', () => {
    const { result } = renderHook(() => useWizardStore())
    act(() => {
      result.current.answerQuestion('height_category', 'h_171_180')
      result.current.resetWizard()
    })
    expect(result.current.answers).toEqual({})
    expect(result.current.currentPhase).toBe(1)
    expect(result.current.currentQuestionIndex).toBe(0)
  })
})

describe('goBack', () => {
  it('decrements questionIndex when > 0', () => {
    const { result } = renderHook(() => useWizardStore())
    act(() => {
      result.current.answerQuestion('height_category', 'h_171_180')
      result.current.goBack()
    })
    expect(result.current.currentQuestionIndex).toBe(0)
  })
})
