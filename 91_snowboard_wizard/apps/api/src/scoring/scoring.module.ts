// scoring.module.ts - NestJS module wrapping the deterministic scoring engine
import { Module } from '@nestjs/common'
import { ScoringService } from './scoring.service'

@Module({
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
