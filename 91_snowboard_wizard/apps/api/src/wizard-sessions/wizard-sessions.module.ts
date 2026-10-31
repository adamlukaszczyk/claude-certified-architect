// wizard-sessions.module.ts
import { Module } from '@nestjs/common'
import { WizardSessionsController } from './wizard-sessions.controller'
import { CacheModule } from '../cache/cache.module'

@Module({
  imports: [CacheModule],
  controllers: [WizardSessionsController],
})
export class WizardSessionsModule {}
