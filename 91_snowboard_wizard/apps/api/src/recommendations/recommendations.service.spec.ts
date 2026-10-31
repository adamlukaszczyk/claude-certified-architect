import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
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

// Mock manager routes save() calls to the appropriate repo mock so existing assertions hold
const mockManager = {
  save: jest.fn().mockImplementation((EntityClass: unknown, data: unknown) => {
    if (EntityClass === WizardSessionEntity) return mockSessionRepo.save(data)
    if (EntityClass === RecommendationEntity) return mockRecommendationRepo.save(data)
    return Promise.resolve(data)
  }),
}

const mockDataSource = {
  transaction: jest.fn().mockImplementation((cb: (manager: typeof mockManager) => Promise<unknown>) => cb(mockManager)),
}

describe('RecommendationsService', () => {
  let service: RecommendationsService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: ScoringService, useValue: mockScoringService },
        { provide: NarrativeService, useValue: mockNarrativeService },
        { provide: getRepositoryToken(RecommendationEntity), useValue: mockRecommendationRepo },
        { provide: getRepositoryToken(WizardSessionEntity), useValue: mockSessionRepo },
        { provide: DataSource, useValue: mockDataSource },
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

  it('create() wraps both saves in a single transaction', async () => {
    await service.create({}, null, null)
    expect(mockDataSource.transaction).toHaveBeenCalledTimes(1)
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
