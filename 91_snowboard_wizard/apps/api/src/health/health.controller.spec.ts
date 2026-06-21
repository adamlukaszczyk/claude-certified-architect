import { Test } from '@nestjs/testing'
import { HealthController } from './health.controller'
import { HealthService, HealthStatus } from './health.service'

const makeRes = () => ({ status: jest.fn().mockReturnThis() }) as any

describe('HealthController', () => {
  let controller: HealthController
  let service: jest.Mocked<HealthService>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: { check: jest.fn() } }],
    }).compile()
    controller = module.get(HealthController)
    service = module.get(HealthService)
  })

  it('returns 200 and status ok when all checks pass', async () => {
    const payload: HealthStatus = {
      status: 'ok',
      checks: {
        postgresql: { status: 'ok' },
        redis: { status: 'ok' },
        anthropic: { status: 'ok' },
        google: { status: 'ok' },
      },
    }
    service.check.mockResolvedValue(payload)
    const res = makeRes()
    const result = await controller.check(res)
    expect(result).toEqual(payload)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 503 when postgresql is down', async () => {
    const payload: HealthStatus = {
      status: 'degraded',
      checks: {
        postgresql: { status: 'error', error: 'connection refused' },
        redis: { status: 'ok' },
        anthropic: { status: 'ok' },
        google: { status: 'ok' },
      },
    }
    service.check.mockResolvedValue(payload)
    const res = makeRes()
    await controller.check(res)
    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('returns 503 when redis is down', async () => {
    const payload: HealthStatus = {
      status: 'degraded',
      checks: {
        postgresql: { status: 'ok' },
        redis: { status: 'error', error: 'ECONNREFUSED' },
        anthropic: { status: 'ok' },
        google: { status: 'ok' },
      },
    }
    service.check.mockResolvedValue(payload)
    const res = makeRes()
    await controller.check(res)
    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('returns 200 when only external checks fail', async () => {
    const payload: HealthStatus = {
      status: 'ok',
      checks: {
        postgresql: { status: 'ok' },
        redis: { status: 'ok' },
        anthropic: { status: 'error', error: 'network timeout' },
        google: { status: 'error', error: 'network timeout' },
      },
    }
    service.check.mockResolvedValue(payload)
    const res = makeRes()
    await controller.check(res)
    expect(res.status).not.toHaveBeenCalled()
  })
})
