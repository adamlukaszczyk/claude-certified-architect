// score-request.dto.ts - Validated request body for POST /api/score
import { IsObject } from 'class-validator'
import type { Answers } from '@snowboard/types'

export class ScoreRequestDto {
  @IsObject()
  answers!: Answers
}
