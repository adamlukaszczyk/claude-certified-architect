// create-recommendation.dto.ts
import { IsObject, IsOptional, IsString } from 'class-validator'
import type { Answers } from '@snowboard/types'

export class CreateRecommendationDto {
  @IsObject()
  answers!: Answers

  @IsString()
  @IsOptional()
  sessionName?: string
}
