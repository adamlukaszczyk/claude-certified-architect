import { HealthService } from './health.service'

const makeService = (overrides: { googleClientId?: string; anthropicApiKey?: string } = {}) => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'google.clientId') return overrides.googleClientId ?? ''
      if (key === 'anthropic.apiKey') return overrides.anthropicApiKey ?? ''
      return ''
    }),
  }
  const dataSource = { query: jest.fn().mockResolvedValue([]) }
  const redis = { client: { ping: jest.fn().mockResolvedValue('PONG') } }
  return new HealthService(dataSource as any, redis as any, config as any)
}

const mockFetch = (body: object) =>
  jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(body) })

describe('HealthService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('checkGoogle', () => {
    it('returns error when GOOGLE_CLIENT_ID is not configured', async () => {
      global.fetch = jest.fn()
      const svc = makeService()
      const result = await svc.check()
      expect(result.checks.google).toEqual({ status: 'error', error: 'GOOGLE_CLIENT_ID not configured' })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('returns ok when Google responds with invalid_grant', async () => {
      global.fetch = mockFetch({ error: 'invalid_grant' })
      const svc = makeService({ googleClientId: 'valid.apps.googleusercontent.com' })
      const result = await svc.check()
      expect(result.checks.google).toEqual({ status: 'ok' })
    })

    it('returns error when Google responds with invalid_client', async () => {
      global.fetch = mockFetch({ error: 'invalid_client' })
      const svc = makeService({ googleClientId: 'bad-id' })
      const result = await svc.check()
      expect(result.checks.google).toEqual({ status: 'error', error: 'GOOGLE_CLIENT_ID not recognised by Google' })
    })

    it('returns error when Google responds with an unexpected error', async () => {
      global.fetch = mockFetch({ error: 'temporarily_unavailable' })
      const svc = makeService({ googleClientId: 'valid.apps.googleusercontent.com' })
      const result = await svc.check()
      expect(result.checks.google).toEqual({ status: 'error', error: 'unexpected response: temporarily_unavailable' })
    })

    it('caches the result for 60s and avoids a second fetch', async () => {
      global.fetch = mockFetch({ error: 'invalid_grant' })
      const svc = makeService({ googleClientId: 'valid.apps.googleusercontent.com' })
      await svc.check()
      await svc.check()
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('checkAnthropic', () => {
    it('returns error when ANTHROPIC_API_KEY is not configured', async () => {
      global.fetch = jest.fn()
      const svc = makeService()
      const result = await svc.check()
      expect(result.checks.anthropic).toEqual({ status: 'error', error: 'ANTHROPIC_API_KEY not configured' })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('returns ok when Anthropic responds 200', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 })
      const svc = makeService({ anthropicApiKey: 'sk-ant-test' })
      const result = await svc.check()
      expect(result.checks.anthropic).toEqual({ status: 'ok' })
    })

    it('returns error on non-200 from Anthropic', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 })
      const svc = makeService({ anthropicApiKey: 'sk-ant-bad' })
      const result = await svc.check()
      expect(result.checks.anthropic).toEqual({ status: 'error', error: 'HTTP 401' })
    })

    it('caches the result for 60s and avoids a second fetch', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 })
      const svc = makeService({ anthropicApiKey: 'sk-ant-test' })
      await svc.check()
      await svc.check()
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('error messages are safe', () => {
    it('postgres error does not expose internal details', async () => {
      global.fetch = jest.fn()
      const config = { get: jest.fn().mockReturnValue('') }
      const dataSource = { query: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1:5432')) }
      const redis = { client: { ping: jest.fn().mockResolvedValue('PONG') } }
      const svc = new HealthService(dataSource as any, redis as any, config as any)
      const result = await svc.check()
      expect(result.checks.postgresql.error).toBe('unreachable')
    })

    it('redis error does not expose internal details', async () => {
      global.fetch = jest.fn()
      const config = { get: jest.fn().mockReturnValue('') }
      const dataSource = { query: jest.fn().mockResolvedValue([]) }
      const redis = { client: { ping: jest.fn().mockRejectedValue(new Error('Stream isn\'t writeable')) } }
      const svc = new HealthService(dataSource as any, redis as any, config as any)
      const result = await svc.check()
      expect(result.checks.redis.error).toBe('unreachable')
    })
  })
})
