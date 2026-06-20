import type { SpecScores, Answers } from '../index'

describe('SpecScores type', () => {
  it('accepts a complete spec scores object', () => {
    const scores: SpecScores = {
      length: 10,
      width: 2,
      flex: 5,
      shape: 1,
      camber: 0,
      taper: 1,
      sidecut: 0,
      setback: -1,
      base: 0,
      float: 3,
    }
    expect(typeof scores.flex).toBe('number')
  })
})

describe('Answers type', () => {
  it('accepts a partial answers object (all fields optional)', () => {
    const answers: Answers = {
      experience: 'advanced',
      style: 'powder',
      ridingDays: 30,
    }
    expect(answers.experience).toBe('advanced')
  })
})
