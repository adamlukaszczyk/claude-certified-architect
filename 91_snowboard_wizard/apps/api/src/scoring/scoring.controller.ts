// scoring.controller.ts - POST /api/score: stateless incremental scoring
import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common'
import { ScoringService } from './scoring.service'
import { ScoreRequestDto } from './dto/score-request.dto'
import type { PartialScores } from '@snowboard/types'

@Controller('score')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post()
  score(@Body() dto: ScoreRequestDto): { scores: PartialScores } {
    const scores = this.scoringService.partialScore(dto.answers)
    return { scores }
  }
}
