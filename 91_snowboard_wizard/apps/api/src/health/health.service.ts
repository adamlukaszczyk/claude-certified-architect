// health.service.ts - Dependency connectivity checks for the health endpoint
import { Injectable, Logger } from '@nestjs/common'
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

const EXTERNAL_CACHE_TTL_MS = 60_000

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name)
  private anthropicCache: { result: CheckResult; expiresAt: number } | null = null
  private googleCache: { result: CheckResult; expiresAt: number } | null = null

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
      this.logger.error('PostgreSQL health check failed', err)
      return { status: 'error', error: 'unreachable' }
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    try {
      const reply = await this.redis.client.ping()
      return reply === 'PONG' ? { status: 'ok' } : { status: 'error', error: 'unexpected reply' }
    } catch (err) {
      this.logger.error('Redis health check failed', err)
      return { status: 'error', error: 'unreachable' }
    }
  }

  private async checkAnthropic(): Promise<CheckResult> {
    if (this.anthropicCache && Date.now() < this.anthropicCache.expiresAt) {
      return this.anthropicCache.result
    }

    const apiKey = this.config.get<string>('anthropic.apiKey')
    if (!apiKey) return { status: 'error', error: 'ANTHROPIC_API_KEY not configured' }

    let result: CheckResult
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 5000)
    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        signal: ac.signal,
      })
      result = res.ok ? { status: 'ok' } : { status: 'error', error: `HTTP ${res.status}` }
    } catch (err) {
      this.logger.error('Anthropic health check failed', err)
      result = { status: 'error', error: 'unreachable' }
    } finally {
      clearTimeout(timer)
    }

    this.anthropicCache = { result, expiresAt: Date.now() + EXTERNAL_CACHE_TTL_MS }
    return result
  }

  private async checkGoogle(): Promise<CheckResult> {
    if (this.googleCache && Date.now() < this.googleCache.expiresAt) {
      return this.googleCache.result
    }

    const clientId = this.config.get<string>('google.clientId')
    if (!clientId) return { status: 'error', error: 'GOOGLE_CLIENT_ID not configured' }

    let result: CheckResult
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 5000)
    try {
      // POST a dummy token exchange — a registered client_id yields "invalid_grant",
      // an unrecognised one yields "invalid_client". Either way we get a 400, so we
      // inspect the error field rather than the HTTP status.
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
      const body = (await res.json()) as { error?: string }
      if (body.error === 'invalid_grant' || body.error === 'invalid_request') {
        // invalid_grant: client_id recognised, dummy code rejected (expected)
        // invalid_request: client_id recognised but client_secret missing — still confirms registration
        result = { status: 'ok' }
      } else if (body.error === 'invalid_client') {
        result = { status: 'error', error: 'GOOGLE_CLIENT_ID not recognised by Google' }
      } else {
        this.logger.warn('Google token endpoint returned unexpected error', body)
        result = { status: 'error', error: `unexpected response: ${body.error ?? 'none'}` }
      }
    } catch (err) {
      this.logger.error('Google health check failed', err)
      result = { status: 'error', error: 'unreachable' }
    } finally {
      clearTimeout(timer)
    }

    this.googleCache = { result, expiresAt: Date.now() + EXTERNAL_CACHE_TTL_MS }
    return result
  }
}
