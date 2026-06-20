import { Test } from '@nestjs/testing'
import { NarrativeService } from './narrative.service'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import type { Answers, SpecSheet } from '@snowboard/types'

const mockSpecSheet: SpecSheet = {
  lengthCm: 155, waistWidthMm: 248, flexRating: 5, flexLabel: 'Medium',
  shape: 'directional-twin', camberProfile: 'hybrid', taperMm: 0,
  sidecutRadius: 'medium', setback: 'slight', baseType: 'sintered', floatPriority: 'low',
}
const mockAnswers: Answers = { experience: 'intermediate', style: 'all-mountain' }

jest.mock('@anthropic-ai/sdk')

describe('NarrativeService', () => {
  let service: NarrativeService

  beforeEach(async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Your board is perfect for all-mountain riding.' }],
    })
    const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>
    MockAnthropic.prototype.messages = { create: mockCreate } as unknown as typeof MockAnthropic.prototype.messages

    const module = await Test.createTestingModule({
      providers: [
        NarrativeService,
        { provide: ConfigService, useValue: { get: () => 'sk-ant-test' } },
      ],
    }).compile()
    service = module.get(NarrativeService)
  })

  it('generate() returns a string from the Claude response', async () => {
    const result = await service.generate(mockAnswers, mockSpecSheet)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('generate() with no API key returns a fallback message', async () => {
    const moduleNoKey = await Test.createTestingModule({
      providers: [
        NarrativeService,
        { provide: ConfigService, useValue: { get: () => '' } },
      ],
    }).compile()
    const svcNoKey = moduleNoKey.get(NarrativeService)
    const result = await svcNoKey.generate(mockAnswers, mockSpecSheet)
    expect(typeof result).toBe('string')
  })
})
