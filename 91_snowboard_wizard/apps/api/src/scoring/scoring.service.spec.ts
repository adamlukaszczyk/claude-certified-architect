import { Test } from '@nestjs/testing'
import { ScoringService } from './scoring.service'
import type { Answers } from '@snowboard/types'

describe('ScoringService', () => {
  let service: ScoringService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ScoringService],
    }).compile()
    service = module.get(ScoringService)
  })

  it('partialScore with no answers returns all-zero scores', () => {
    const result = service.partialScore({})
    expect(result.flex).toBe(0)
    expect(result.length).toBe(0)
  })

  it('powder style accumulates positive taper, shape, float, setback weights', () => {
    const answers: Answers = { style: 'powder' }
    const result = service.partialScore(answers)
    expect((result.taper ?? 0)).toBeGreaterThan(0)
    expect((result.float ?? 0)).toBeGreaterThan(0)
    expect((result.shape ?? 0)).toBeGreaterThan(0)
  })

  it('freestyle style produces negative flex score from style alone', () => {
    const answers: Answers = { style: 'freestyle' }
    const result = service.partialScore(answers)
    expect((result.flex ?? 0)).toBeLessThan(0)
  })

  it('carving style produces positive camber score', () => {
    const answers: Answers = { style: 'carving' }
    const result = service.partialScore(answers)
    expect((result.camber ?? 0)).toBeGreaterThan(0)
  })

  it('beginner experience reduces flex', () => {
    const noExp = service.partialScore({})
    const beginner = service.partialScore({ experience: 'beginner' })
    expect((beginner.flex ?? 0)).toBeLessThan((noExp.flex ?? 0))
  })

  it('heavier rider accumulates positive length, width, flex', () => {
    const light = service.partialScore({ weightCategory: 'under_55' })
    const heavy = service.partialScore({ weightCategory: 'over_100' })
    expect((heavy.length ?? 0)).toBeGreaterThan((light.length ?? 0))
    expect((heavy.flex ?? 0)).toBeGreaterThan((light.flex ?? 0))
  })

  it('score() returns a SpecSheet with expected string/number types', () => {
    const answers: Answers = {
      experience: 'advanced',
      style: 'powder',
      weightCategory: 'w_71_85',
    }
    const { specSheet } = service.score(answers)
    expect(typeof specSheet.lengthCm).toBe('number')
    expect(typeof specSheet.flexRating).toBe('number')
    expect(typeof specSheet.flexLabel).toBe('string')
    expect(typeof specSheet.shape).toBe('string')
    expect(typeof specSheet.camberProfile).toBe('string')
    expect(typeof specSheet.baseType).toBe('string')
  })

  it('score() flex=7 maps to Medium-Stiff label (integration)', () => {
    // advanced(+1) + w_86_100(+2) + carving(+2) = flex 5 → scoreRange [5,8] → "Medium-Stiff"
    const answers: Answers = {
      experience: 'advanced',
      weightCategory: 'w_86_100',
      style: 'carving',
    }
    const { specSheet } = service.score(answers)
    expect(specSheet.flexLabel).toBe('Medium-Stiff')
  })

  it('score() powder style maps to directional shape', () => {
    // powder gives shape+3 → scoreRange [2,4] → "directional"
    const answers: Answers = { style: 'powder' }
    const { specSheet } = service.score(answers)
    expect(specSheet.shape).toBe('directional')
  })
})
