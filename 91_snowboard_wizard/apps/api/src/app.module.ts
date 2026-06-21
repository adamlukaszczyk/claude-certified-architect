// app.module.ts - Root NestJS module
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import configuration from './config/configuration'
import { DbModule } from './db/db.module'
import { CacheModule } from './cache/cache.module'
import { ScoringModule } from './scoring/scoring.module'
import { NarrativeModule } from './narrative/narrative.module'
import { RecommendationsModule } from './recommendations/recommendations.module'
import { AuthModule } from './auth/auth.module'
import { WizardSessionsModule } from './wizard-sessions/wizard-sessions.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    DbModule,
    CacheModule,
    ScoringModule,
    NarrativeModule,
    RecommendationsModule,
    AuthModule,
    WizardSessionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
