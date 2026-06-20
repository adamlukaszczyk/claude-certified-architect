import type { Question, Option, ScoreMapping } from '../types'

describe('Question type', () => {
  it('accepts a well-formed option-based question', () => {
    const option: Option = {
      id: 'low_taper',
      text: 'Stable and predictable',
      weights: { taper: -1 },
    }
    const q: Question = {
      id: 'taper_preference',
      phase: 3,
      text: 'How surfy do you want your board to feel?',
      showIf: 'isPowderFocused',
      options: [option],
    }
    expect(q.id).toBe('taper_preference')
    expect(q.phase).toBe(3)
  })

  it('accepts a numeric range question', () => {
    const q: Question = {
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

describe('ScoreMapping type', () => {
  it('accepts a valid score mapping entry', () => {
    const mapping: ScoreMapping = {
      scoreRange: [0, 3],
      value: 2,
      label: 'Soft',
      description: 'Forgiving and playful',
    }
    expect(mapping.scoreRange[0]).toBe(0)
    expect(mapping.scoreRange[1]).toBe(3)
  })

  it('accepts a string value (for categorical specs)', () => {
    const mapping: ScoreMapping = {
      scoreRange: [-999, -2],
      value: 'twin',
      label: 'True Twin',
      description: 'Identical nose and tail',
    }
    expect(mapping.value).toBe('twin')
  })
})
