// health.module.ts
import { Module } from '@nestjs/common'
import { DbModule } from '../db/db.module'
import { CacheModule } from '../cache/cache.module'
import { HealthService } from './health.service'
import { HealthController } from './health.controller'

@Module({
  imports: [DbModule, CacheModule],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
