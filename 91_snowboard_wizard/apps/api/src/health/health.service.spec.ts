import { HealthService } from './health.service'
import { ConfigService } from '@nestjs/config'

const makeService = (clientId: string) => {
  const config = { get: jest.fn((key: string) => (key === 'google.clientId' ? clientId : '')) }
  const dataSource = { query: jest.fn().mockResolvedValue([]) }
  const redis = { client: { ping: jest.fn().mockResolvedValue('PONG') } }
  return new HealthService(dataSource as any, redis as any, config as any)
}

global.fetch = jest.fn()

describe('HealthService.checkGoogle', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns error when GOOGLE_CLIENT_ID is not configured', async () => {
    const svc = makeService('')
    const result = await svc.check()
    expect(result.checks.google).toEqual({ status: 'error', error: 'GOOGLE_CLIENT_ID not configured' })
  })

  it('returns ok when Google responds with invalid_grant (client_id recognised)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    })
    const svc = makeService('valid-client-id.apps.googleusercontent.com')
    const result = await svc.check()
    expect(result.checks.google).toEqual({ status: 'ok' })
  })

  it('returns error when Google responds with invalid_client', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ error: 'invalid_client' }),
    })
    const svc = makeService('bad-client-id')
    const result = await svc.check()
    expect(result.checks.google).toEqual({
      status: 'error',
      error: 'GOOGLE_CLIENT_ID not recognised by Google',
    })
  })
})
