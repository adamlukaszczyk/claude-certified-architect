import { Test } from '@nestjs/testing'
import { ScoringController } from './scoring.controller'
import { ScoringService } from './scoring.service'
import type { PartialScores } from '@snowboard/types'

const mockScores: PartialScores = { flex: 3, length: 1 }
const mockScoringService = { partialScore: jest.fn().mockReturnValue(mockScores) }

describe('ScoringController', () => {
  let controller: ScoringController

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ScoringController],
      providers: [{ provide: ScoringService, useValue: mockScoringService }],
    }).compile()
    controller = module.get(ScoringController)
  })

  it('POST /score returns partial scores', () => {
    const result = controller.score({ answers: { style: 'powder' } })
    expect(result).toEqual({ scores: mockScores })
    expect(mockScoringService.partialScore).toHaveBeenCalledWith({ style: 'powder' })
  })
})
