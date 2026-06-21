// redis.service.ts - Thin wrapper around ioredis with JSON serialization
import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis

  constructor(config: ConfigService) {
    this.client = new Redis(config.get<string>('redisUrl') ?? 'redis://localhost:6379', {
      lazyConnect: true,
      enableOfflineQueue: false,
    })
  }

  async setEx(key: string, ttlSeconds: number, value: unknown): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value))
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key)
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds)
  }

  onModuleDestroy(): void {
    this.client.quit()
  }
}
