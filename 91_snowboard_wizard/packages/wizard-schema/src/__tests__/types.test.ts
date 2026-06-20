import type { Question, OptionQuestion, NumericQuestion, Option, ScoreMapping } from '../types'

describe('OptionQuestion', () => {
  it('accepts a well-formed option question', () => {
    const option: Option = {
      id: 'low_taper',
      text: 'Stable and predictable',
      weights: { taper: -1 },
    }
    const q: OptionQuestion = {
      id: 'taper_preference',
      phase: 3,
      text: 'How surfy do you want your board to feel?',
      showIf: 'isPowderFocused',
      options: [option],
    }
    expect(q.id).toBe('taper_preference')
    expect(q.phase).toBe(3)
    expect(q.options).toHaveLength(1)
  })
})

describe('NumericQuestion', () => {
  it('requires answersKey and inputType numeric', () => {
    const q: NumericQuestion = {
      id: 'riding_days',
      phase: 1,
      text: 'How many days per season do you ride?',
      inputType: 'numeric',
      answersKey: 'ridingDays',
      min: 1,
      max: 200,
      unit: 'days/season',
    }
    expect(q.inputType).toBe('numeric')
    expect(q.answersKey).toBe('ridingDays')
  })
})

describe('Question union', () => {
  it('narrows correctly via inputType discriminant', () => {
    const q: Question = {
      id: 'riding_days',
      phase: 1,
      text: 'Days?',
      inputType: 'numeric',
      answersKey: 'ridingDays',
    }
    if (q.inputType === 'numeric') {
      expect(q.answersKey).toBe('ridingDays')
    }
  })
})

describe('ScoreMapping', () => {
  it('accepts a numeric spec value', () => {
    const m: ScoreMapping = { scoreRange: [0, 3], value: 2, label: 'Soft', description: 'Forgiving' }
    expect(m.scoreRange).toEqual([0, 3])
  })

  it('accepts a string spec value for categorical specs', () => {
    const m: ScoreMapping = { scoreRange: [-999, -2], value: 'twin', label: 'True Twin', description: 'Identical nose and tail' }
    expect(m.value).toBe('twin')
  })
})
