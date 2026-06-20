import { rules } from '../rules'

const base = (): import('@snowboard/types').Answers => ({
  experience: 'intermediate',
  style: 'all-mountain',
  ridingDays: 20,
  terrain: { park: 20, groomed: 40, backcountry: 30, trees: 10 },
})

describe('isFreestyle', () => {
  it('returns true when style is freestyle', () => {
    expect(rules.isFreestyle({ ...base(), style: 'freestyle' })).toBe(true)
  })
  it('returns false for other styles', () => {
    expect(rules.isFreestyle(base())).toBe(false)
  })
})

describe('isPowderFocused', () => {
  it('returns true for powder style', () => {
    expect(rules.isPowderFocused({ ...base(), style: 'powder' })).toBe(true)
  })
  it('returns true for freeride style', () => {
    expect(rules.isPowderFocused({ ...base(), style: 'freeride' })).toBe(true)
  })
  it('returns false for all-mountain', () => {
    expect(rules.isPowderFocused(base())).toBe(false)
  })
})

describe('isCarving', () => {
  it('returns true for carving style', () => {
    expect(rules.isCarving({ ...base(), style: 'carving' })).toBe(true)
  })
})

describe('isAllMountain', () => {
  it('returns true for all-mountain style', () => {
    expect(rules.isAllMountain(base())).toBe(true)
  })
})

describe('splitboardCandidate', () => {
  it('returns true for freeride with heavy backcountry and many riding days', () => {
    expect(rules.splitboardCandidate({
      ...base(),
      style: 'freeride',
      terrain: { park: 0, groomed: 10, backcountry: 80, trees: 10 },
      ridingDays: 20,
    })).toBe(true)
  })
  it('returns false when backcountry is under 60%', () => {
    expect(rules.splitboardCandidate({
      ...base(),
      style: 'freeride',
      terrain: { park: 10, groomed: 40, backcountry: 40, trees: 10 },
      ridingDays: 20,
    })).toBe(false)
  })
  it('returns false when riding days is under 15', () => {
    expect(rules.splitboardCandidate({
      ...base(),
      style: 'freeride',
      terrain: { park: 0, groomed: 10, backcountry: 80, trees: 10 },
      ridingDays: 10,
    })).toBe(false)
  })
})

describe('needsTaperQuestion', () => {
  it('returns true for advanced powder rider with high flex score', () => {
    expect(rules.needsTaperQuestion(
      { ...base(), style: 'powder', experience: 'advanced' },
      { flex: 6 }
    )).toBe(true)
  })
  it('returns false for beginner powder rider', () => {
    expect(rules.needsTaperQuestion(
      { ...base(), style: 'powder', experience: 'beginner' },
      { flex: 6 }
    )).toBe(false)
  })
  it('returns false when flex score is below 5', () => {
    expect(rules.needsTaperQuestion(
      { ...base(), style: 'powder', experience: 'advanced' },
      { flex: 4 }
    )).toBe(false)
  })
})
