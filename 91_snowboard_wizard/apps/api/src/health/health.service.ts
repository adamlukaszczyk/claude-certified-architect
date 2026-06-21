// health.service.ts - Dependency connectivity checks for the health endpoint
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { RedisService } from '../cache/redis.service'

type CheckStatus = 'ok' | 'error'

interface CheckResult {
  status: CheckStatus
  error?: string
}

export interface HealthStatus {
  status: 'ok' | 'degraded'
  checks: {
    postgresql: CheckResult
    redis: CheckResult
    anthropic: CheckResult
    google: CheckResult
  }
}

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async check(): Promise<HealthStatus> {
    const [postgresql, redis, anthropic, google] = await Promise.all([
      this.checkPostgresql(),
      this.checkRedis(),
      this.checkAnthropic(),
      this.checkGoogle(),
    ])

    const coreOk = postgresql.status === 'ok' && redis.status === 'ok'

    return {
      status: coreOk ? 'ok' : 'degraded',
      checks: { postgresql, redis, anthropic, google },
    }
  }

  private async checkPostgresql(): Promise<CheckResult> {
    try {
      await this.dataSource.query('SELECT 1')
      return { status: 'ok' }
    } catch (err) {
      return { status: 'error', error: String(err) }
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    try {
      const reply = await this.redis.client.ping()
      return reply === 'PONG' ? { status: 'ok' } : { status: 'error', error: `unexpected reply: ${reply}` }
    } catch (err) {
      return { status: 'error', error: String(err) }
    }
  }

  private async checkAnthropic(): Promise<CheckResult> {
    const apiKey = this.config.get<string>('anthropic.apiKey')
    if (!apiKey) return { status: 'error', error: 'ANTHROPIC_API_KEY not configured' }

    try {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 5000)
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        signal: ac.signal,
      })
      clearTimeout(timer)
      return res.ok ? { status: 'ok' } : { status: 'error', error: `HTTP ${res.status}` }
    } catch (err) {
      return { status: 'error', error: String(err) }
    }
  }

  private async checkGoogle(): Promise<CheckResult> {
    const clientId = this.config.get<string>('google.clientId')
    if (!clientId) return { status: 'error', error: 'GOOGLE_CLIENT_ID not configured' }

    try {
      // POST a dummy token exchange — a registered client_id yields "invalid_grant",
      // an unrecognised one yields "invalid_client". Either way we get a 400, so we
      // inspect the error field rather than the HTTP status.
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 5000)
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'health-check-probe',
          client_id: clientId,
          redirect_uri: 'http://localhost',
        }),
        signal: ac.signal,
      })
      clearTimeout(timer)
      const body = (await res.json()) as { error?: string }
      if (body.error === 'invalid_client') {
        return { status: 'error', error: 'GOOGLE_CLIENT_ID not recognised by Google' }
      }
      // Any other error (e.g. "invalid_grant") means the client is valid but the
      // dummy code was rejected — expected behaviour for this probe.
      return { status: 'ok' }
    } catch (err) {
      return { status: 'error', error: String(err) }
    }
  }
}
