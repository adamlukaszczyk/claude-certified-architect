// narrative.module.ts
import { Module } from '@nestjs/common'
import { NarrativeService } from './narrative.service'
import { CacheModule } from '../cache/cache.module'

@Module({
  imports: [CacheModule],
  providers: [NarrativeService],
  exports: [NarrativeService],
})
export class NarrativeModule {}
