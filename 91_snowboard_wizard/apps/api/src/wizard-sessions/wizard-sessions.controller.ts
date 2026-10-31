// wizard-sessions.controller.ts - PUT/GET for in-progress wizard answers (Redis cache)
import { Controller, Put, Get, Param, Body } from '@nestjs/common'
import { IsObject, IsInt, Min, Max } from 'class-validator'
import { RedisService } from '../cache/redis.service'
import type { Answers } from '@snowboard/types'

const SESSION_TTL = 604800 // 7 days in seconds

class SaveSessionDto {
  @IsObject()
  answers!: Answers

  @IsInt()
  @Min(1)
  @Max(4)
  phase!: number
}

type CachedSession = { answers: Answers; phase: number }

@Controller('sessions')
export class WizardSessionsController {
  constructor(private readonly redis: RedisService) {}

  @Put(':id')
  async save(@Param('id') id: string, @Body() dto: SaveSessionDto): Promise<void> {
    await this.redis.setEx(`session:${id}`, SESSION_TTL, { answers: dto.answers, phase: dto.phase })
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<CachedSession | null> {
    return this.redis.get<CachedSession>(`session:${id}`)
  }
}
