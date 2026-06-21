import { Test } from '@nestjs/testing'
import { WizardSessionsController } from './wizard-sessions.controller'
import { RedisService } from '../cache/redis.service'

const mockRedisService = {
  setEx: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
}

describe('WizardSessionsController', () => {
  let controller: WizardSessionsController

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [WizardSessionsController],
      providers: [{ provide: RedisService, useValue: mockRedisService }],
    }).compile()
    controller = module.get(WizardSessionsController)
    jest.clearAllMocks()
  })

  it('PUT /:id saves answers to Redis with 7-day TTL', async () => {
    await controller.save('session-abc', { answers: { style: 'powder' }, phase: 2 })
    expect(mockRedisService.setEx).toHaveBeenCalledWith(
      'session:session-abc',
      604800,
      { answers: { style: 'powder' }, phase: 2 }
    )
  })

  it('GET /:id returns cached session or 404', async () => {
    mockRedisService.get.mockResolvedValue({ answers: { style: 'powder' }, phase: 2 })
    const result = await controller.get('session-abc')
    expect(result).toEqual({ answers: { style: 'powder' }, phase: 2 })
  })

  it('GET /:id returns null when session not in cache', async () => {
    mockRedisService.get.mockResolvedValue(null)
    const result = await controller.get('session-missing')
    expect(result).toBeNull()
  })
})
