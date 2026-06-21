import { Test } from '@nestjs/testing'
import { RedisService } from './redis.service'
import { ConfigService } from '@nestjs/config'

// Use in-memory mock instead of real Redis
jest.mock('ioredis', () => {
  const store = new Map<string, string>()
  const expiry = new Map<string, number>()
  return jest.fn().mockImplementation(() => ({
    set: jest.fn().mockImplementation((k: string, v: string) => { store.set(k, v); return 'OK' }),
    setex: jest.fn().mockImplementation((k: string, _ttl: number, v: string) => { store.set(k, v); return 'OK' }),
    get: jest.fn().mockImplementation((k: string) => store.get(k) ?? null),
    del: jest.fn().mockImplementation((k: string) => { store.delete(k); return 1 }),
    incr: jest.fn().mockImplementation((k: string) => {
      const v = parseInt(store.get(k) ?? '0', 10) + 1
      store.set(k, String(v))
      return v
    }),
    expire: jest.fn().mockImplementation((k: string, ttl: number) => { expiry.set(k, ttl); return 1 }),
    quit: jest.fn(),
  }))
})

describe('RedisService', () => {
  let service: RedisService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: { get: () => 'redis://localhost:6379' } },
      ],
    }).compile()
    service = module.get(RedisService)
  })

  it('setEx and get round-trip a JSON value', async () => {
    const data = { answers: { style: 'powder' } }
    await service.setEx('session:test-1', 60, data)
    const result = await service.get<typeof data>('session:test-1')
    expect(result).toEqual(data)
  })

  it('get on missing key returns null', async () => {
    const result = await service.get('session:nonexistent')
    expect(result).toBeNull()
  })

  it('incr increments atomically', async () => {
    const first = await service.incr('counter:test')
    const second = await service.incr('counter:test')
    expect(second).toBe(first + 1)
  })
})
