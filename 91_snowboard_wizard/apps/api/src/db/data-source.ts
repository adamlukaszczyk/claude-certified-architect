// data-source.ts - TypeORM DataSource for migrations CLI
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { UserEntity } from '../entities/user.entity'
import { WizardSessionEntity } from '../entities/wizard-session.entity'
import { RecommendationEntity } from '../entities/recommendation.entity'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://wizard:wizard@localhost:5432/wizard',
  entities: [UserEntity, WizardSessionEntity, RecommendationEntity, RefreshTokenEntity],
  migrations: ['dist/db/migrations/*.js'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
})
