// app.module.ts - Root NestJS module
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import configuration from './config/configuration'
import { DbModule } from './db/db.module'
import { ScoringModule } from './scoring/scoring.module'
import { NarrativeModule } from './narrative/narrative.module'
import { RecommendationsModule } from './recommendations/recommendations.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    DbModule,
    ScoringModule,
    NarrativeModule,
    RecommendationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
