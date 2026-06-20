// recommendations.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RecommendationEntity } from '../entities/recommendation.entity'
import { WizardSessionEntity } from '../entities/wizard-session.entity'
import { RecommendationsService } from './recommendations.service'
import { RecommendationsController } from './recommendations.controller'
import { ScoringModule } from '../scoring/scoring.module'
import { NarrativeModule } from '../narrative/narrative.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([RecommendationEntity, WizardSessionEntity]),
    ScoringModule,
    NarrativeModule,
  ],
  providers: [RecommendationsService],
  controllers: [RecommendationsController],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
