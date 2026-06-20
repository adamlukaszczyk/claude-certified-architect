// app.module.ts - Root NestJS module
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import configuration from './config/configuration'
import { DbModule } from './db/db.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    DbModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
