import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { RecommendationsService } from './recommendations.service'
import { RecommendationEntity } from '../entities/recommendation.entity'
import { WizardSessionEntity } from '../entities/wizard-session.entity'
import { ScoringService } from '../scoring/scoring.service'
import { NarrativeService } from '../narrative/narrative.service'
import type { Answers, SpecSheet } from '@snowboard/types'

const mockSpecSheet: SpecSheet = {
  lengthCm: 155, waistWidthMm: 248, flexRating: 5, flexLabel: 'Medium',
  shape: 'directional-twin', camberProfile: 'hybrid', taperMm: 0,
  sidecutRadius: 'medium', setback: 'slight', baseType: 'sintered', floatPriority: 'low',
}

const mockScoringService = {
  score: jest.fn().mockReturnValue({ scores: { flex: 3 }, specSheet: mockSpecSheet }),
}
const mockNarrativeService = {
  generate: jest.fn().mockResolvedValue('Great board for all-mountain.'),
}

const mockSessionRepo = {
  save: jest.fn().mockImplementation((e: Partial<WizardSessionEntity>) => ({ ...e, id: 'session-1', createdAt: new Date(), updatedAt: new Date() })),
}
const mockRecommendationRepo = {
  save: jest.fn().mockImplementation((e: Partial<RecommendationEntity>) => ({ ...e, id: 'rec-1', createdAt: new Date() })),
  findOne: jest.fn(),
}

describe('RecommendationsService', () => {
  let service: RecommendationsService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: ScoringService, useValue: mockScoringService },
        { provide: NarrativeService, useValue: mockNarrativeService },
        { provide: getRepositoryToken(RecommendationEntity), useValue: mockRecommendationRepo },
        { provide: getRepositoryToken(WizardSessionEntity), useValue: mockSessionRepo },
      ],
    }).compile()
    service = module.get(RecommendationsService)
  })

  it('create() saves session and recommendation, returns id and shareToken', async () => {
    const answers: Answers = { style: 'all-mountain', experience: 'intermediate' }
    const result = await service.create(answers, null, null)
    expect(result.id).toBe('rec-1')
    expect(typeof result.shareToken).toBe('string')
    expect(result.shareToken.length).toBeGreaterThan(20)
    expect(result.specSheet).toEqual(mockSpecSheet)
    expect(mockSessionRepo.save).toHaveBeenCalled()
    expect(mockRecommendationRepo.save).toHaveBeenCalled()
  })

  it('create() share_token is URL-safe base64 (no +, /, =)', async () => {
    const result = await service.create({}, null, null)
    expect(result.shareToken).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('findByShareToken() calls findOne with the share token', async () => {
    mockRecommendationRepo.findOne.mockResolvedValue({ id: 'rec-1', shareToken: 'abc' })
    const result = await service.findByShareToken('abc')
    expect(mockRecommendationRepo.findOne).toHaveBeenCalledWith({
      where: { shareToken: 'abc' },
      relations: ['session'],
    })
    expect(result?.id).toBe('rec-1')
  })
})
