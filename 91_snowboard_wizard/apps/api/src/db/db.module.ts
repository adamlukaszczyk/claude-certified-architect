// db.module.ts - TypeORM module wired to ConfigService
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { UserEntity } from '../entities/user.entity'
import { WizardSessionEntity } from '../entities/wizard-session.entity'
import { RecommendationEntity } from '../entities/recommendation.entity'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('databaseUrl'),
        entities: [UserEntity, WizardSessionEntity, RecommendationEntity, RefreshTokenEntity],
        migrations: ['dist/db/migrations/*.js'],
        synchronize: false,
      }),
    }),
  ],
})
export class DbModule {}
