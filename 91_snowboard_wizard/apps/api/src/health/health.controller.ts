// health.controller.ts - Liveness probe with dependency connectivity checks
import { Controller, Get, Res } from '@nestjs/common'
import { Response } from 'express'
import { HealthService, HealthStatus } from './health.service'

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthStatus> {
    const status = await this.health.check()
    const coreHealthy = status.checks.postgresql.status === 'ok' && status.checks.redis.status === 'ok'
    if (!coreHealthy) res.status(503)
    return status
  }
}
