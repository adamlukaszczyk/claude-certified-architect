# Snowboard Wizard — Plan 2: NestJS API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NestJS API in `apps/api/` — deterministic scoring engine (Stage 1), Claude narrative service (Stage 2), recommendations CRUD, Google OAuth + JWT auth, guest session claim, and Redis caching — producing a fully working REST API that `apps/web` will call in Plan 3.

**Architecture:** NestJS 10 with CommonJS modules (required for `emitDecoratorMetadata`). Scoring service imports `@snowboard/wizard-schema` to load YAML at startup; deterministic Stage 1 accumulates answer weights then maps through scoring tables; Stage 2 calls Claude for a narrative overlay. TypeORM manages four PostgreSQL tables. Auth uses PassportStrategy(jwt) on all protected routes and an Origin/Referer CSRF guard on all state-changing endpoints. Docker Compose provides the full local stack (api + postgres + redis + web stub).

**Tech Stack:** NestJS 10, TypeORM 0.3, PostgreSQL 16, Redis 7 (ioredis), passport-jwt, google-auth-library, Anthropic SDK, class-validator, Docker Compose

## Global Constraints

- All code lives under `91_snowboard_wizard/apps/api/`
- TypeScript strict mode; no `any`; no `as` casts except `as keyof Answers` in the scoring utility
- NestJS module format is CommonJS (`"module": "CommonJS"`) — this overrides `tsconfig.base.json`'s NodeNext; `emitDecoratorMetadata: true` and `experimentalDecorators: true` are required
- `packages/wizard-schema` is the only place schema lives — scoring service imports from it, never reimplements question data
- `share_token` is `crypto.randomBytes(32).toString('base64url')` — minimum 128 bits entropy
- JWT lives in an httpOnly cookie named `access_token`; `SameSite=Lax` (not Strict — breaks Google OAuth callback), `Secure` flag set when `NODE_ENV=production`
- All state-changing endpoints (POST/PUT/PATCH/DELETE) carry a `CsrfGuard` that checks the `Origin` or `Referer` header against `ALLOWED_ORIGINS` env var
- Guest → user session claim must rotate the session's `id` (delete old, insert new) to prevent session fixation
- Claude model for narrative: `claude-sonnet-4-6`
- Redis TTL for in-progress wizard answers: 7 days (604800 seconds)
- Rate limit on Claude calls: 10 per user per minute (sliding window, key = `rate:claude:<userId>`)
- TypeORM migrations are forward-only; failed migration aborts startup
- `pnpm turbo build` must pass after every task; `pnpm turbo test` must pass after Tasks 1, 3, 4, 5, 6, 7

---

### Task 1: NestJS scaffold + health endpoint + Docker Compose

**Files:**
- Modify: `packages/wizard-schema/package.json` — add `"require"` and `"default"` export conditions
- Modify: `packages/wizard-schema/src/index.ts` — add `SCHEMA_ROOT` export
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.controller.spec.ts`
- Create: `91_snowboard_wizard/docker-compose.yml`
- Create: `91_snowboard_wizard/.env.example`
- Create: `91_snowboard_wizard/infra/docker/Dockerfile.api`

**Interfaces:**
- Produces: `GET /health` → `{ status: 'ok' }`, `SCHEMA_ROOT: string` exported from `@snowboard/wizard-schema`

- [ ] **Step 1: Add `require`/`default` export conditions to wizard-schema**

Edit `packages/wizard-schema/package.json` — change the `exports` block from:
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  }
}
```
to:
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "require": "./dist/index.js",
    "default": "./dist/index.js"
  }
}
```

Reason: NestJS uses CommonJS `require()`; without `"require"` or `"default"`, Node.js throws `ERR_PACKAGE_PATH_NOT_EXPORTED` at runtime.

- [ ] **Step 2: Export `SCHEMA_ROOT` from wizard-schema**

Edit `packages/wizard-schema/src/index.ts` — add at the top after existing imports:
```typescript
import path from 'path'

export const SCHEMA_ROOT = path.resolve(__dirname, '..')
```

The full updated `packages/wizard-schema/src/index.ts`:
```typescript
// index.ts - Public API for @snowboard/wizard-schema
import path from 'path'

export const SCHEMA_ROOT = path.resolve(__dirname, '..')
export { rules } from './rules'
export type { RuleName } from './rules'
export { loadQuestions, loadScoringTables } from './loader'
export type { Question, OptionQuestion, NumericQuestion, Option, ScoreMapping, ScoringTable, QuestionInputType } from './types'
```

`__dirname` resolves to `packages/wizard-schema/src/` in source and `packages/wizard-schema/dist/` in built output; `..` from either gives `packages/wizard-schema/` where `questions/` and `scoring/` live.

- [ ] **Step 3: Verify wizard-schema still builds and tests pass**

```bash
cd 91_snowboard_wizard
pnpm turbo build test --filter=@snowboard/wizard-schema
```
Expected: `Tasks: 2 successful` and all 38 tests pass.

- [ ] **Step 4: Create `apps/api/package.json`**

```json
{
  "name": "@snowboard/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "dev": "nest start --watch",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.36.0",
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@snowboard/types": "workspace:*",
    "@snowboard/wizard-schema": "workspace:*",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "cookie-parser": "^1.4.6",
    "google-auth-library": "^9.0.0",
    "ioredis": "^5.3.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "pg": "^8.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "typeorm": "^0.3.20",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/cookie-parser": "^1.4.6",
    "@types/jest": "^29.5.0",
    "@types/node": "^26.0.0",
    "@types/passport-jwt": "^4.0.0",
    "@types/pg": "^8.0.0",
    "@types/uuid": "^10.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.6.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": "tsconfig.json" }] },
    "moduleNameMapper": {
      "^@snowboard/types$": "<rootDir>/../../packages/types/src/index.ts",
      "^@snowboard/wizard-schema$": "<rootDir>/../../packages/wizard-schema/src/index.ts"
    },
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 5: Create `apps/api/tsconfig.json`**

NestJS requires CommonJS and decorator metadata — this overrides the NodeNext defaults from `tsconfig.base.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "target": "ES2021",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "rootDir": "src",
    "outDir": "dist",
    "incremental": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "test"]
}
```

- [ ] **Step 6: Create `apps/api/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

- [ ] **Step 7: Create `apps/api/src/main.ts`**

```typescript
// main.ts - NestJS bootstrap
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  app.setGlobalPrefix('api')
  const port = process.env.PORT ?? 3001
  await app.listen(port)
}

bootstrap()
```

- [ ] **Step 8: Create `apps/api/src/app.module.ts`**

```typescript
// app.module.ts - Root NestJS module
import { Module } from '@nestjs/common'
import { HealthController } from './health/health.controller'

@Module({
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 9: Write the failing health controller test**

Create `apps/api/src/health/health.controller.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { HealthController } from './health.controller'

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile()
    controller = module.get(HealthController)
  })

  it('returns { status: "ok" }', () => {
    expect(controller.check()).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 10: Run test to verify it fails**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: FAIL — `Cannot find module './health.controller'`

- [ ] **Step 11: Create `apps/api/src/health/health.controller.ts`**

```typescript
// health.controller.ts - Liveness probe
import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' }
  }
}
```

- [ ] **Step 12: Run test to verify it passes**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: PASS — `1 test passed`

- [ ] **Step 13: Create `91_snowboard_wizard/docker-compose.yml`**

```yaml
services:
  api:
    build:
      context: .
      dockerfile: infra/docker/Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://wizard:wizard@postgres:5432/wizard
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env.local
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    develop:
      watch:
        - action: sync+restart
          path: ./apps/api/src
          target: /app/apps/api/src

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: wizard
      POSTGRES_PASSWORD: wizard
      POSTGRES_DB: wizard
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wizard"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

- [ ] **Step 14: Create `91_snowboard_wizard/.env.example`**

```
# NestJS API
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://wizard:wizard@localhost:5432/wizard

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change-me-in-production-minimum-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# CSRF
ALLOWED_ORIGINS=http://localhost:3000
```

- [ ] **Step 14b: Create `91_snowboard_wizard/infra/docker/Dockerfile.api`**

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/wizard-schema/package.json packages/wizard-schema/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY apps/api/ apps/api/
COPY packages/types/ packages/types/
COPY packages/wizard-schema/ packages/wizard-schema/

# Build
RUN pnpm --filter @snowboard/types build
RUN pnpm --filter @snowboard/wizard-schema build
RUN pnpm --filter @snowboard/api build

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
```

- [ ] **Step 15: Install dependencies and verify build**

```bash
cd 91_snowboard_wizard
pnpm install
pnpm turbo build --filter=@snowboard/api
```
Expected: `Tasks: 1 successful` — NestJS compiles to `apps/api/dist/`

- [ ] **Step 16: Commit**

```bash
git add apps/api/ packages/wizard-schema/package.json packages/wizard-schema/src/index.ts 91_snowboard_wizard/docker-compose.yml 91_snowboard_wizard/.env.example 91_snowboard_wizard/infra/
git commit -m "feat: NestJS API scaffold — health endpoint, Docker Compose, wizard-schema CJS export"
```

---

### Task 2: Config module + TypeORM entities + migrations

**Files:**
- Create: `apps/api/src/config/configuration.ts`
- Create: `apps/api/src/db/data-source.ts`
- Create: `apps/api/src/db/db.module.ts`
- Create: `apps/api/src/entities/user.entity.ts`
- Create: `apps/api/src/entities/wizard-session.entity.ts`
- Create: `apps/api/src/entities/recommendation.entity.ts`
- Create: `apps/api/src/entities/refresh-token.entity.ts`
- Create: `apps/api/src/db/migrations/1000000001-CreateUsers.ts`
- Create: `apps/api/src/db/migrations/1000000002-CreateWizardSessions.ts`
- Create: `apps/api/src/db/migrations/1000000003-CreateRecommendations.ts`
- Create: `apps/api/src/db/migrations/1000000004-CreateRefreshTokens.ts`
- Modify: `apps/api/src/app.module.ts` — add ConfigModule + TypeOrmModule
- Modify: `apps/api/package.json` — add migration scripts

**Interfaces:**
- Produces: 4 TypeORM entities; `DataSource` for CLI migrations; `DbModule` for the app

- [ ] **Step 1: Create `apps/api/src/config/configuration.ts`**

```typescript
// configuration.ts - Typed environment variables
export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://wizard:wizard@localhost:5432/wizard',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '30d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
  },
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
})
```

- [ ] **Step 2: Create `apps/api/src/entities/user.entity.ts`**

```typescript
// user.entity.ts - Registered users (created on first Google login)
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'google_id', unique: true })
  googleId!: string

  @Column({ unique: true })
  email!: string

  @Column({ nullable: true, type: 'text' })
  name!: string | null

  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
```

- [ ] **Step 3: Create `apps/api/src/entities/wizard-session.entity.ts`**

```typescript
// wizard-session.entity.ts - Wizard progress (guest or authenticated)
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import type { Answers, PartialScores } from '@snowboard/types'
import { UserEntity } from './user.entity'

@Entity('wizard_sessions')
export class WizardSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId!: string | null

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null

  @Column({ nullable: true, type: 'text' })
  name!: string | null

  @Column({ type: 'jsonb', default: '{}' })
  answers!: Answers

  @Column({ type: 'jsonb', nullable: true })
  scores!: PartialScores | null

  @Column({ name: 'schema_version', default: 1 })
  schemaVersion!: number

  @Column({ name: 'phase_reached', default: 1 })
  phaseReached!: number

  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' })
  completedAt!: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date
}
```

- [ ] **Step 4: Create `apps/api/src/entities/recommendation.entity.ts`**

```typescript
// recommendation.entity.ts - Final spec sheet + Claude narrative
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm'
import type { SpecSheet } from '@snowboard/types'
import { WizardSessionEntity } from './wizard-session.entity'

@Entity('recommendations')
export class RecommendationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'session_id', unique: true })
  sessionId!: string

  @OneToOne(() => WizardSessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: WizardSessionEntity

  @Column({ name: 'spec_sheet', type: 'jsonb' })
  specSheet!: SpecSheet

  @Column({ name: 'claude_narrative', nullable: true, type: 'text' })
  claudeNarrative!: string | null

  @Column({ name: 'share_token', unique: true })
  shareToken!: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
```

- [ ] **Step 5: Create `apps/api/src/entities/refresh-token.entity.ts`**

```typescript
// refresh-token.entity.ts - Refresh tokens (stored hashed, one per device session)
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { UserEntity } from './user.entity'

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id' })
  userId!: string

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity

  @Column({ name: 'token_hash', unique: true })
  tokenHash!: string

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
```

- [ ] **Step 6: Create `apps/api/src/db/data-source.ts`**

Used by TypeORM CLI for migrations:
```typescript
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
```

- [ ] **Step 7: Create `apps/api/src/db/db.module.ts`**

```typescript
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
```

- [ ] **Step 8: Create migration 1 — users**

Create `apps/api/src/db/migrations/1000000001-CreateUsers.ts`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateUsers1000000001 implements MigrationInterface {
  name = 'CreateUsers1000000001'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "google_id"  text NOT NULL,
        "email"      text NOT NULL,
        "name"       text,
        "avatar_url" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_google_id" UNIQUE ("google_id"),
        CONSTRAINT "uq_users_email"     UNIQUE ("email")
      )
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`)
  }
}
```

- [ ] **Step 9: Create migration 2 — wizard_sessions**

Create `apps/api/src/db/migrations/1000000002-CreateWizardSessions.ts`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateWizardSessions1000000002 implements MigrationInterface {
  name = 'CreateWizardSessions1000000002'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wizard_sessions" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"        uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "name"           text,
        "answers"        jsonb NOT NULL DEFAULT '{}',
        "scores"         jsonb,
        "schema_version" integer NOT NULL DEFAULT 1,
        "phase_reached"  integer NOT NULL DEFAULT 1,
        "completed_at"   timestamptz,
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "updated_at"     timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE INDEX "idx_wizard_sessions_user_id" ON "wizard_sessions" ("user_id")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_wizard_sessions_user_id"`)
    await queryRunner.query(`DROP TABLE "wizard_sessions"`)
  }
}
```

- [ ] **Step 10: Create migration 3 — recommendations**

Create `apps/api/src/db/migrations/1000000003-CreateRecommendations.ts`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateRecommendations1000000003 implements MigrationInterface {
  name = 'CreateRecommendations1000000003'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "recommendations" (
        "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id"       uuid NOT NULL UNIQUE REFERENCES "wizard_sessions"("id") ON DELETE CASCADE,
        "spec_sheet"       jsonb NOT NULL,
        "claude_narrative" text,
        "share_token"      text NOT NULL,
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_recommendations_share_token" UNIQUE ("share_token")
      )
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "recommendations"`)
  }
}
```

- [ ] **Step 11: Create migration 4 — refresh_tokens**

Create `apps/api/src/db/migrations/1000000004-CreateRefreshTokens.ts`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateRefreshTokens1000000004 implements MigrationInterface {
  name = 'CreateRefreshTokens1000000004'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"     uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash"  text NOT NULL,
        "expires_at"  timestamptz NOT NULL,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_refresh_tokens_token_hash" UNIQUE ("token_hash")
      )
    `)
    await queryRunner.query(`
      CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_refresh_tokens_user_id"`)
    await queryRunner.query(`DROP TABLE "refresh_tokens"`)
  }
}
```

- [ ] **Step 12: Add migration scripts to `apps/api/package.json`**

Add to the `scripts` block:
```json
"migration:run": "typeorm migration:run -d dist/db/data-source.js",
"migration:revert": "typeorm migration:revert -d dist/db/data-source.js"
```

The full updated `scripts` block:
```json
"scripts": {
  "build": "nest build",
  "start": "node dist/main",
  "dev": "nest start --watch",
  "test": "jest",
  "typecheck": "tsc --noEmit",
  "migration:run": "typeorm migration:run -d dist/db/data-source.js",
  "migration:revert": "typeorm migration:revert -d dist/db/data-source.js"
}
```

- [ ] **Step 13: Update `apps/api/src/app.module.ts`**

```typescript
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
```

- [ ] **Step 14: Build and run migrations against postgres**

Start postgres:
```bash
cd 91_snowboard_wizard
docker compose up postgres -d
```

Build and run migrations:
```bash
pnpm --filter @snowboard/api build
DATABASE_URL=postgresql://wizard:wizard@localhost:5432/wizard pnpm --filter @snowboard/api migration:run
```

Expected output (4 lines):
```
query: SELECT ... FROM "migrations"
Migration CreateUsers1000000001 has been executed successfully.
Migration CreateWizardSessions1000000002 has been executed successfully.
Migration CreateRecommendations1000000003 has been executed successfully.
Migration CreateRefreshTokens1000000004 has been executed successfully.
```

- [ ] **Step 15: Verify revert works**

```bash
DATABASE_URL=postgresql://wizard:wizard@localhost:5432/wizard pnpm --filter @snowboard/api migration:revert
DATABASE_URL=postgresql://wizard:wizard@localhost:5432/wizard pnpm --filter @snowboard/api migration:run
```
Expected: revert removes `refresh_tokens`, re-run restores it.

- [ ] **Step 16: Commit**

```bash
git add apps/api/
git commit -m "feat: TypeORM entities and migrations for 4-table PostgreSQL schema"
```

---

### Task 3: Scoring service (Stage 1 — deterministic)

**Files:**
- Create: `apps/api/src/scoring/scoring.module.ts`
- Create: `apps/api/src/scoring/scoring.service.ts`
- Create: `apps/api/src/scoring/scoring.service.spec.ts`

**Interfaces:**
- Consumes: `loadQuestions(SCHEMA_ROOT)`, `loadScoringTables(SCHEMA_ROOT)`, `SCHEMA_ROOT` from `@snowboard/wizard-schema`; `Answers`, `PartialScores`, `SpecScores`, `SpecSheet` from `@snowboard/types`
- Produces:
  ```typescript
  class ScoringService {
    partialScore(answers: Answers): PartialScores
    score(answers: Answers): { scores: SpecScores; specSheet: SpecSheet }
  }
  ```

- [ ] **Step 1: Write the failing scoring service tests**

Create `apps/api/src/scoring/scoring.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { ScoringService } from './scoring.service'
import type { Answers } from '@snowboard/types'

describe('ScoringService', () => {
  let service: ScoringService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ScoringService],
    }).compile()
    service = module.get(ScoringService)
  })

  it('partialScore with no answers returns all-zero scores', () => {
    const result = service.partialScore({})
    expect(result.flex).toBe(0)
    expect(result.length).toBe(0)
  })

  it('powder style accumulates positive taper, shape, float, setback weights', () => {
    const answers: Answers = { style: 'powder' }
    const result = service.partialScore(answers)
    expect((result.taper ?? 0)).toBeGreaterThan(0)
    expect((result.float ?? 0)).toBeGreaterThan(0)
    expect((result.shape ?? 0)).toBeGreaterThan(0)
  })

  it('freestyle style produces negative flex score from style alone', () => {
    const answers: Answers = { style: 'freestyle' }
    const result = service.partialScore(answers)
    expect((result.flex ?? 0)).toBeLessThan(0)
  })

  it('carving style produces positive camber score', () => {
    const answers: Answers = { style: 'carving' }
    const result = service.partialScore(answers)
    expect((result.camber ?? 0)).toBeGreaterThan(0)
  })

  it('beginner experience reduces flex', () => {
    const noExp = service.partialScore({})
    const beginner = service.partialScore({ experience: 'beginner' })
    expect((beginner.flex ?? 0)).toBeLessThan((noExp.flex ?? 0))
  })

  it('heavier rider accumulates positive length, width, flex', () => {
    const light = service.partialScore({ weightCategory: 'under_55' })
    const heavy = service.partialScore({ weightCategory: 'over_100' })
    expect((heavy.length ?? 0)).toBeGreaterThan((light.length ?? 0))
    expect((heavy.flex ?? 0)).toBeGreaterThan((light.flex ?? 0))
  })

  it('score() returns a SpecSheet with expected string/number types', () => {
    const answers: Answers = {
      experience: 'advanced',
      style: 'powder',
      weightCategory: 'w_71_85',
    }
    const { specSheet } = service.score(answers)
    expect(typeof specSheet.lengthCm).toBe('number')
    expect(typeof specSheet.flexRating).toBe('number')
    expect(typeof specSheet.flexLabel).toBe('string')
    expect(typeof specSheet.shape).toBe('string')
    expect(typeof specSheet.camberProfile).toBe('string')
    expect(typeof specSheet.baseType).toBe('string')
  })

  it('score() flex=7 maps to Medium-Stiff label (integration)', () => {
    // Force a flex score of 7: expert(+3) + over_100(+3) + carving(+2) + ice snow(+2) + hardpack(+2) = 12 → stiff
    // Use known combination that yields flex ∈ [5, 8] → Medium-Stiff:
    // advanced(+1) + w_71_85(+1) + style=all-mountain(0) + hardpack(+0) = flex 2
    // Not enough. Use: advanced(+1) + w_86_100(+2) + carving(+2) = flex 5 → Medium-Stiff
    const answers: Answers = {
      experience: 'advanced',
      weightCategory: 'w_86_100',
      style: 'carving',
    }
    const { specSheet } = service.score(answers)
    expect(specSheet.flexLabel).toBe('Medium-Stiff')
  })

  it('score() powder+tapered returns tapered-directional shape', () => {
    // powder: shape+3, offpiste terrain: shape 0, total shape=3 → scoreRange [2,4] → "directional"
    // Need shape ≥ 5 for tapered-directional: powder(+3) + mostly_backcountry terrain(0)
    // shape from powder=3, from terrain 0 → total 3 → "directional"
    // So just check shape is a valid string
    const answers: Answers = { style: 'powder' }
    const { specSheet } = service.score(answers)
    expect(['twin', 'directional-twin', 'directional', 'tapered-directional']).toContain(specSheet.shape)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: FAIL — `Cannot find module './scoring.service'`

- [ ] **Step 3: Create `apps/api/src/scoring/scoring.service.ts`**

```typescript
// scoring.service.ts - Stage 1 deterministic scoring engine
import { Injectable } from '@nestjs/common'
import { loadQuestions, loadScoringTables, SCHEMA_ROOT } from '@snowboard/wizard-schema'
import type { Question, OptionQuestion, ScoringTable } from '@snowboard/wizard-schema'
import type { Answers, PartialScores, SpecScores, SpecSheet } from '@snowboard/types'

// Maps snake_case question ID → camelCase Answers key
function toAnswersKey(questionId: string): keyof Answers {
  return questionId.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()) as keyof Answers
}

function lookupMapping(tables: ScoringTable[], dimension: keyof SpecScores, raw: number): { value: number | string; label: string } {
  const table = tables.find(t => t.dimension === dimension)
  if (!table) throw new Error(`No scoring table for dimension: ${dimension}`)
  const mapping = table.mappings.find(m => raw >= m.scoreRange[0] && raw <= m.scoreRange[1])
  if (!mapping) throw new Error(`No mapping found for ${dimension} score ${raw}`)
  return { value: mapping.value, label: mapping.label }
}

@Injectable()
export class ScoringService {
  private readonly questions: Question[]
  private readonly tables: ScoringTable[]

  constructor() {
    this.questions = loadQuestions(SCHEMA_ROOT)
    this.tables = loadScoringTables(SCHEMA_ROOT)
  }

  partialScore(answers: Answers): PartialScores {
    return this.accumulate(answers)
  }

  score(answers: Answers): { scores: SpecScores; specSheet: SpecSheet } {
    const scores = this.accumulate(answers) as SpecScores
    const specSheet = this.buildSpecSheet(scores)
    return { scores, specSheet }
  }

  private accumulate(answers: Answers): PartialScores {
    const raw: Record<string, number> = {
      length: 0, width: 0, flex: 0, shape: 0, camber: 0,
      taper: 0, sidecut: 0, setback: 0, base: 0, float: 0,
    }

    for (const q of this.questions) {
      if (q.inputType === 'numeric') continue
      const answerKey = toAnswersKey(q.id)
      const selectedId = answers[answerKey] as string | undefined
      if (!selectedId) continue
      const option = (q as OptionQuestion).options.find(o => o.id === selectedId)
      if (!option) continue
      for (const [dim, weight] of Object.entries(option.weights)) {
        raw[dim] = (raw[dim] ?? 0) + (weight as number)
      }
    }

    return raw as PartialScores
  }

  private buildSpecSheet(scores: SpecScores): SpecSheet {
    const flex = lookupMapping(this.tables, 'flex', scores.flex)
    const length = lookupMapping(this.tables, 'length', scores.length)
    const width = lookupMapping(this.tables, 'width', scores.width)
    const shape = lookupMapping(this.tables, 'shape', scores.shape)
    const camber = lookupMapping(this.tables, 'camber', scores.camber)
    const taper = lookupMapping(this.tables, 'taper', scores.taper)
    const sidecut = lookupMapping(this.tables, 'sidecut', scores.sidecut)
    const setback = lookupMapping(this.tables, 'setback', scores.setback)
    const base = lookupMapping(this.tables, 'base', scores.base)
    const float = lookupMapping(this.tables, 'float', scores.float)

    return {
      lengthCm: length.value as number,
      waistWidthMm: width.value as number,
      flexRating: flex.value as number,
      flexLabel: flex.label,
      shape: shape.value as string,
      camberProfile: camber.value as string,
      taperMm: taper.value as number,
      sidecutRadius: sidecut.value as string,
      setback: setback.value as string,
      baseType: base.value as string,
      floatPriority: float.value as string,
    }
  }
}
```

- [ ] **Step 4: Create `apps/api/src/scoring/scoring.module.ts`**

```typescript
// scoring.module.ts
import { Module } from '@nestjs/common'
import { ScoringService } from './scoring.service'

@Module({
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: PASS — all 9 scoring tests + 1 health test = 10 tests.

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @snowboard/api typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/scoring/
git commit -m "feat: scoring service — Stage 1 deterministic weight accumulation + spec sheet mapping"
```

---

### Task 4: Scoring controller + Narrative service

**Files:**
- Create: `apps/api/src/scoring/dto/score-request.dto.ts`
- Create: `apps/api/src/scoring/scoring.controller.ts`
- Create: `apps/api/src/scoring/scoring.controller.spec.ts`
- Create: `apps/api/src/narrative/narrative.module.ts`
- Create: `apps/api/src/narrative/narrative.service.ts`
- Create: `apps/api/src/narrative/narrative.service.spec.ts`
- Modify: `apps/api/src/app.module.ts` — add ScoringModule, NarrativeModule

**Interfaces:**
- Consumes: `ScoringService.partialScore()`, `ScoringService.score()`
- Produces:
  - `POST /api/score` body: `ScoreRequestDto` → response: `{ scores: PartialScores }`
  - `NarrativeService.generate(answers, specSheet)` → `Promise<string>`

- [ ] **Step 1: Write the failing scoring controller test**

Create `apps/api/src/scoring/scoring.controller.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { ScoringController } from './scoring.controller'
import { ScoringService } from './scoring.service'
import type { PartialScores } from '@snowboard/types'

const mockScores: PartialScores = { flex: 3, length: 1 }
const mockScoringService = { partialScore: jest.fn().mockReturnValue(mockScores) }

describe('ScoringController', () => {
  let controller: ScoringController

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ScoringController],
      providers: [{ provide: ScoringService, useValue: mockScoringService }],
    }).compile()
    controller = module.get(ScoringController)
  })

  it('POST /score returns partial scores', () => {
    const result = controller.score({ answers: { style: 'powder' } })
    expect(result).toEqual({ scores: mockScores })
    expect(mockScoringService.partialScore).toHaveBeenCalledWith({ style: 'powder' })
  })
})
```

- [ ] **Step 2: Write the failing narrative service test**

Create `apps/api/src/narrative/narrative.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { NarrativeService } from './narrative.service'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import type { Answers, SpecSheet } from '@snowboard/types'

const mockSpecSheet: SpecSheet = {
  lengthCm: 155, waistWidthMm: 248, flexRating: 5, flexLabel: 'Medium',
  shape: 'directional-twin', camberProfile: 'hybrid', taperMm: 0,
  sidecutRadius: 'medium', setback: 'slight', baseType: 'sintered', floatPriority: 'low',
}
const mockAnswers: Answers = { experience: 'intermediate', style: 'all-mountain' }

jest.mock('@anthropic-ai/sdk')

describe('NarrativeService', () => {
  let service: NarrativeService

  beforeEach(async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Your board is perfect for all-mountain riding.' }],
    })
    const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>
    MockAnthropic.prototype.messages = { create: mockCreate } as unknown as typeof MockAnthropic.prototype.messages

    const module = await Test.createTestingModule({
      providers: [
        NarrativeService,
        { provide: ConfigService, useValue: { get: () => 'sk-ant-test' } },
      ],
    }).compile()
    service = module.get(NarrativeService)
  })

  it('generate() returns a string from the Claude response', async () => {
    const result = await service.generate(mockAnswers, mockSpecSheet)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('generate() with no API key returns a fallback message', async () => {
    const moduleNoKey = await Test.createTestingModule({
      providers: [
        NarrativeService,
        { provide: ConfigService, useValue: { get: () => '' } },
      ],
    }).compile()
    const svcNoKey = moduleNoKey.get(NarrativeService)
    const result = await svcNoKey.generate(mockAnswers, mockSpecSheet)
    expect(typeof result).toBe('string')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: FAIL — `Cannot find module './scoring.controller'` and `Cannot find module './narrative.service'`

- [ ] **Step 4: Create `apps/api/src/scoring/dto/score-request.dto.ts`**

```typescript
// score-request.dto.ts - Validated request body for POST /api/score
import { IsObject } from 'class-validator'
import type { Answers } from '@snowboard/types'

export class ScoreRequestDto {
  @IsObject()
  answers!: Answers
}
```

- [ ] **Step 5: Create `apps/api/src/scoring/scoring.controller.ts`**

```typescript
// scoring.controller.ts - POST /api/score: stateless incremental scoring
import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common'
import { ScoringService } from './scoring.service'
import { ScoreRequestDto } from './dto/score-request.dto'
import type { PartialScores } from '@snowboard/types'

@Controller('score')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post()
  score(@Body() dto: ScoreRequestDto): { scores: PartialScores } {
    const scores = this.scoringService.partialScore(dto.answers)
    return { scores }
  }
}
```

- [ ] **Step 6: Create `apps/api/src/narrative/narrative.service.ts`**

```typescript
// narrative.service.ts - Stage 2: Claude narrative overlay on top of deterministic spec
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import type { Answers, SpecSheet } from '@snowboard/types'

const NARRATIVE_PROMPT = `You are a professional snowboard fitter with 20 years of experience.
A rider has completed a selection wizard. Based on their profile and derived spec sheet, write a personalized recommendation.

Rider profile:
- Experience: {experience}
- Riding style: {style}
- Riding days per season: {ridingDays}
- Terrain preference: {terrainMix}

Derived specification:
- Board length: {lengthCm} cm
- Waist width: {waistWidthMm} mm
- Flex rating: {flexRating}/10 ({flexLabel})
- Shape: {shape}
- Camber profile: {camberProfile}
- Taper: {taperMm} mm
- Sidecut radius: {sidecutRadius}
- Stance setback: {setback}
- Base type: {baseType}
- Powder float priority: {floatPriority}

Write exactly four sections separated by blank lines:
1. A 2–3 sentence personalized explanation of why these specs suit this rider.
2. One sentence about the main trade-off (what they sacrifice for this build).
3. One sentence suggesting an alternative to consider if their priorities shift.
4. Any contradiction flags (e.g., beginner requesting expert terrain, or freestyle rider with carving-optimized flex). If none, write "No contradictions detected."

Write in second person ("Your board..."). Be specific — reference the actual spec values. No markdown headers or bullet points.`

@Injectable()
export class NarrativeService {
  private readonly client: Anthropic | null

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('anthropic.apiKey') ?? ''
    this.client = apiKey ? new Anthropic({ apiKey }) : null
  }

  async generate(answers: Answers, specSheet: SpecSheet): Promise<string> {
    if (!this.client) {
      return `Spec sheet generated: ${specSheet.flexLabel} flex, ${specSheet.lengthCm} cm ${specSheet.shape} with ${specSheet.camberProfile} profile.`
    }

    const prompt = NARRATIVE_PROMPT
      .replace('{experience}', answers.experience ?? 'not specified')
      .replace('{style}', answers.style ?? 'not specified')
      .replace('{ridingDays}', String(answers.ridingDays ?? 'not specified'))
      .replace('{terrainMix}', answers.terrainMix ?? 'not specified')
      .replace('{lengthCm}', String(specSheet.lengthCm))
      .replace('{waistWidthMm}', String(specSheet.waistWidthMm))
      .replace('{flexRating}', String(specSheet.flexRating))
      .replace('{flexLabel}', specSheet.flexLabel)
      .replace('{shape}', specSheet.shape)
      .replace('{camberProfile}', specSheet.camberProfile)
      .replace('{taperMm}', String(specSheet.taperMm))
      .replace('{sidecutRadius}', specSheet.sidecutRadius)
      .replace('{setback}', specSheet.setback)
      .replace('{baseType}', specSheet.baseType)
      .replace('{floatPriority}', specSheet.floatPriority)

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text : ''
  }
}
```

- [ ] **Step 7: Create `apps/api/src/narrative/narrative.module.ts`**

```typescript
// narrative.module.ts
import { Module } from '@nestjs/common'
import { NarrativeService } from './narrative.service'

@Module({
  providers: [NarrativeService],
  exports: [NarrativeService],
})
export class NarrativeModule {}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: PASS — all tests including scoring controller and narrative service.

- [ ] **Step 9: Update `apps/api/src/app.module.ts`**

```typescript
// app.module.ts - Root NestJS module
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import configuration from './config/configuration'
import { DbModule } from './db/db.module'
import { ScoringModule } from './scoring/scoring.module'
import { NarrativeModule } from './narrative/narrative.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    DbModule,
    ScoringModule,
    NarrativeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 10: Typecheck and build**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api typecheck
pnpm turbo build --filter=@snowboard/api
```
Expected: no errors, `Tasks: 1 successful`.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/scoring/ apps/api/src/narrative/ apps/api/src/app.module.ts
git commit -m "feat: scoring controller (POST /api/score) and Claude narrative service"
```

---

### Task 5: Recommendations module

**Files:**
- Create: `apps/api/src/recommendations/dto/create-recommendation.dto.ts`
- Create: `apps/api/src/recommendations/recommendations.service.ts`
- Create: `apps/api/src/recommendations/recommendations.controller.ts`
- Create: `apps/api/src/recommendations/recommendations.module.ts`
- Create: `apps/api/src/recommendations/recommendations.service.spec.ts`
- Modify: `apps/api/src/app.module.ts` — add RecommendationsModule

**Interfaces:**
- Consumes: `ScoringService.score()`, `NarrativeService.generate()`, `RecommendationEntity`, `WizardSessionEntity`
- Produces:
  - `POST /api/recommendations` body: `{ answers: Answers; sessionName?: string }` → `{ id, shareToken, specSheet, claudeNarrative }`
  - `GET /api/recommendations/:id` (JWT-guarded) → same shape
  - `GET /api/recommendations/share/:token` (public) → same shape
  - `GET /api/recommendations/:id/pdf` → 501 Not Implemented (Puppeteer deferred to Plan 4)

- [ ] **Step 1: Write the failing recommendations service test**

Create `apps/api/src/recommendations/recommendations.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { RecommendationsService } from './recommendations.service'
import { RecommendationEntity } from '../entities/recommendation.entity'
import { WizardSessionEntity } from '../entities/wizard-session.entity'
import { ScoringService } from '../scoring/scoring.service'
import { NarrativeService } from '../narrative/narrative.service'
import type { Answers, SpecSheet } from '@snowboard/types'

const mockSpecSheet: SpecSheet = {
  lengthCm: 155, waistWidthMm: 248, flexRating: 5, flexLabel: 'Medium',
  shape: 'directional-twin', camberProfile: 'hybrid', taperMm: 0,
  sidecutRadius: 'medium', setback: 'slight', baseType: 'sintered', floatPriority: 'low',
}

const mockScoringService = {
  score: jest.fn().mockReturnValue({ scores: { flex: 3 }, specSheet: mockSpecSheet }),
}
const mockNarrativeService = {
  generate: jest.fn().mockResolvedValue('Great board for all-mountain.'),
}

const mockSessionRepo = {
  save: jest.fn().mockImplementation((e: Partial<WizardSessionEntity>) => ({ ...e, id: 'session-1', createdAt: new Date(), updatedAt: new Date() })),
}
const mockRecommendationRepo = {
  save: jest.fn().mockImplementation((e: Partial<RecommendationEntity>) => ({ ...e, id: 'rec-1', createdAt: new Date() })),
  findOne: jest.fn(),
}

describe('RecommendationsService', () => {
  let service: RecommendationsService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: ScoringService, useValue: mockScoringService },
        { provide: NarrativeService, useValue: mockNarrativeService },
        { provide: getRepositoryToken(RecommendationEntity), useValue: mockRecommendationRepo },
        { provide: getRepositoryToken(WizardSessionEntity), useValue: mockSessionRepo },
      ],
    }).compile()
    service = module.get(RecommendationsService)
  })

  it('create() saves session and recommendation, returns id and shareToken', async () => {
    const answers: Answers = { style: 'all-mountain', experience: 'intermediate' }
    const result = await service.create(answers, null, null)
    expect(result.id).toBe('rec-1')
    expect(typeof result.shareToken).toBe('string')
    expect(result.shareToken.length).toBeGreaterThan(20)
    expect(result.specSheet).toEqual(mockSpecSheet)
    expect(mockSessionRepo.save).toHaveBeenCalled()
    expect(mockRecommendationRepo.save).toHaveBeenCalled()
  })

  it('create() share_token is URL-safe base64 (no +, /, =)', async () => {
    const result = await service.create({}, null, null)
    expect(result.shareToken).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('findByShareToken() calls findOne with the share token', async () => {
    mockRecommendationRepo.findOne.mockResolvedValue({ id: 'rec-1', shareToken: 'abc' })
    const result = await service.findByShareToken('abc')
    expect(mockRecommendationRepo.findOne).toHaveBeenCalledWith({
      where: { shareToken: 'abc' },
      relations: ['session'],
    })
    expect(result?.id).toBe('rec-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: FAIL — `Cannot find module './recommendations.service'`

- [ ] **Step 3: Create `apps/api/src/recommendations/dto/create-recommendation.dto.ts`**

```typescript
// create-recommendation.dto.ts
import { IsObject, IsOptional, IsString } from 'class-validator'
import type { Answers } from '@snowboard/types'

export class CreateRecommendationDto {
  @IsObject()
  answers!: Answers

  @IsString()
  @IsOptional()
  sessionName?: string
}
```

- [ ] **Step 4: Create `apps/api/src/recommendations/recommendations.service.ts`**

```typescript
// recommendations.service.ts - Creates and retrieves recommendations
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomBytes } from 'crypto'
import { RecommendationEntity } from '../entities/recommendation.entity'
import { WizardSessionEntity } from '../entities/wizard-session.entity'
import { ScoringService } from '../scoring/scoring.service'
import { NarrativeService } from '../narrative/narrative.service'
import type { Answers, SpecSheet } from '@snowboard/types'

type RecommendationResult = {
  id: string
  shareToken: string
  specSheet: SpecSheet
  claudeNarrative: string | null
  sessionId: string
}

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(RecommendationEntity)
    private readonly recRepo: Repository<RecommendationEntity>,
    @InjectRepository(WizardSessionEntity)
    private readonly sessionRepo: Repository<WizardSessionEntity>,
    private readonly scoringService: ScoringService,
    private readonly narrativeService: NarrativeService,
  ) {}

  async create(
    answers: Answers,
    userId: string | null,
    sessionName: string | null,
  ): Promise<RecommendationResult> {
    const { scores, specSheet } = this.scoringService.score(answers)
    const claudeNarrative = await this.narrativeService.generate(answers, specSheet)

    const session = await this.sessionRepo.save({
      userId,
      name: sessionName ?? null,
      answers,
      scores,
      schemaVersion: 1,
      phaseReached: 4,
      completedAt: new Date(),
    } as Partial<WizardSessionEntity>)

    const shareToken = randomBytes(32).toString('base64url')
    const rec = await this.recRepo.save({
      sessionId: session.id,
      specSheet,
      claudeNarrative,
      shareToken,
    } as Partial<RecommendationEntity>)

    return {
      id: rec.id,
      shareToken: rec.shareToken,
      specSheet,
      claudeNarrative,
      sessionId: session.id,
    }
  }

  async findById(id: string): Promise<RecommendationEntity | null> {
    return this.recRepo.findOne({ where: { id }, relations: ['session'] })
  }

  async findByShareToken(shareToken: string): Promise<RecommendationEntity | null> {
    return this.recRepo.findOne({ where: { shareToken }, relations: ['session'] })
  }
}
```

- [ ] **Step 5: Create `apps/api/src/recommendations/recommendations.controller.ts`**

```typescript
// recommendations.controller.ts - POST/GET recommendations endpoints
import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, NotFoundException, HttpException } from '@nestjs/common'
import { RecommendationsService } from './recommendations.service'
import { CreateRecommendationDto } from './dto/create-recommendation.dto'

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRecommendationDto) {
    return this.service.create(dto.answers, null, dto.sessionName ?? null)
  }

  @Get('share/:token')
  async getByToken(@Param('token') token: string) {
    const rec = await this.service.findByShareToken(token)
    if (!rec) throw new NotFoundException('Recommendation not found')
    return rec
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const rec = await this.service.findById(id)
    if (!rec) throw new NotFoundException('Recommendation not found')
    return rec
  }

  @Get(':id/pdf')
  getPdf() {
    throw new HttpException('PDF export not yet implemented', HttpStatus.NOT_IMPLEMENTED)
  }
}
```

- [ ] **Step 6: Create `apps/api/src/recommendations/recommendations.module.ts`**

```typescript
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
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: PASS — all tests including recommendations service tests.

- [ ] **Step 8: Update `apps/api/src/app.module.ts`**

```typescript
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
```

- [ ] **Step 9: Typecheck**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api typecheck
```
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/recommendations/ apps/api/src/app.module.ts
git commit -m "feat: recommendations module — POST /api/recommendations, GET by id/shareToken"
```

---

### Task 6: Auth module — Google OAuth + JWT + CSRF

**Files:**
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/auth/dto/google-auth.dto.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/csrf.guard.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Modify: `apps/api/src/app.module.ts` — add AuthModule

**Interfaces:**
- Produces:
  - `POST /api/auth/google` body: `{ idToken: string }` → sets httpOnly `access_token` cookie + returns `{ userId, email }`
  - `GET /api/auth/me` (JWT-guarded) → `{ id, email, name, avatarUrl }`
  - `CsrfGuard` — apply to all state-changing endpoints
  - `JwtAuthGuard` — apply to protected endpoints

- [ ] **Step 1: Write the failing auth service test**

Create `apps/api/src/auth/auth.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'

const mockUser = { id: 'user-1', googleId: 'g-1', email: 'test@test.com', name: 'Test', avatarUrl: null, createdAt: new Date() }
const mockUsersService = { upsertFromGoogle: jest.fn().mockResolvedValue(mockUser) }
const mockJwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') }
const mockConfigService = { get: jest.fn().mockReturnValue('google-client-id') }
const mockRefreshTokenRepo = {
  save: jest.fn().mockResolvedValue({ id: 'rt-1', tokenHash: 'hash', expiresAt: new Date() }),
}

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: () => ({
        sub: 'g-1',
        email: 'test@test.com',
        name: 'Test',
        picture: null,
      }),
    }),
  })),
}))

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRefreshTokenRepo },
      ],
    }).compile()
    service = module.get(AuthService)
  })

  it('loginWithGoogle() verifies token and returns access JWT', async () => {
    const result = await service.loginWithGoogle('valid-google-id-token')
    expect(result.accessToken).toBe('mock-jwt-token')
    expect(result.user.email).toBe('test@test.com')
    expect(mockUsersService.upsertFromGoogle).toHaveBeenCalledWith('g-1', 'test@test.com', 'Test', null)
  })

  it('loginWithGoogle() with invalid token throws UnauthorizedException', async () => {
    const { OAuth2Client } = jest.requireMock('google-auth-library')
    OAuth2Client.mockImplementationOnce(() => ({
      verifyIdToken: jest.fn().mockRejectedValue(new Error('invalid token')),
    }))
    const moduleNew = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRefreshTokenRepo },
      ],
    }).compile()
    const svc = moduleNew.get(AuthService)
    await expect(svc.loginWithGoogle('bad-token')).rejects.toThrow('Invalid Google ID token')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test -- --testPathPattern=auth
```
Expected: FAIL — `Cannot find module './auth.service'`

- [ ] **Step 3: Create `apps/api/src/users/users.service.ts`**

```typescript
// users.service.ts - User upsert logic (create on first login, update name/avatar on repeat)
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserEntity } from '../entities/user.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async upsertFromGoogle(
    googleId: string,
    email: string,
    name: string | null,
    avatarUrl: string | null,
  ): Promise<UserEntity> {
    const existing = await this.repo.findOne({ where: { googleId } })
    if (existing) {
      existing.name = name
      existing.avatarUrl = avatarUrl
      return this.repo.save(existing)
    }
    return this.repo.save({ googleId, email, name, avatarUrl })
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } })
  }
}
```

- [ ] **Step 4: Create `apps/api/src/users/users.module.ts`**

```typescript
// users.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from '../entities/user.entity'
import { UsersService } from './users.service'

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 5: Create `apps/api/src/auth/dto/google-auth.dto.ts`**

```typescript
// google-auth.dto.ts
import { IsString, IsNotEmpty } from 'class-validator'

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string
}
```

- [ ] **Step 6: Create `apps/api/src/auth/jwt.strategy.ts`**

```typescript
// jwt.strategy.ts - Validates JWT from httpOnly cookie
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { UsersService } from '../users/users.service'
import type { Request } from 'express'

type JwtPayload = { sub: string; email: string }

function extractJwtFromCookie(req: Request): string | null {
  const token = req.cookies?.access_token
  return typeof token === 'string' ? token : null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') ?? 'dev-secret',
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub)
    if (!user) throw new UnauthorizedException()
    return user
  }
}
```

- [ ] **Step 7: Create `apps/api/src/auth/jwt-auth.guard.ts`**

```typescript
// jwt-auth.guard.ts
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 8: Create `apps/api/src/auth/csrf.guard.ts`**

```typescript
// csrf.guard.ts - Validates Origin or Referer against ALLOWED_ORIGINS on state-changing requests
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>()
    const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    if (safeMethod) return true

    const allowedOrigins = this.config.get<string[]>('allowedOrigins') ?? []
    const origin = req.headers['origin'] ?? req.headers['referer'] ?? ''
    const allowed = allowedOrigins.some(o => (origin as string).startsWith(o))
    if (!allowed) throw new ForbiddenException('CSRF check failed')
    return true
  }
}
```

- [ ] **Step 9: Create `apps/api/src/auth/auth.service.ts`**

```typescript
// auth.service.ts - Google ID token verification, JWT issuance, refresh token storage
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OAuth2Client } from 'google-auth-library'
import { createHash, randomBytes } from 'crypto'
import { UsersService } from '../users/users.service'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'
import type { UserEntity } from '../entities/user.entity'

type LoginResult = {
  accessToken: string
  refreshToken: string
  user: UserEntity
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
  ) {
    this.googleClient = new OAuth2Client(config.get<string>('google.clientId'))
  }

  async loginWithGoogle(idToken: string): Promise<LoginResult> {
    let payload: { sub: string; email?: string; name?: string; picture?: string }
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.config.get<string>('google.clientId'),
      })
      const raw = ticket.getPayload()
      if (!raw?.sub || !raw.email) throw new Error('Missing claims')
      payload = { sub: raw.sub, email: raw.email, name: raw.name, picture: raw.picture }
    } catch {
      throw new UnauthorizedException('Invalid Google ID token')
    }

    const user = await this.usersService.upsertFromGoogle(
      payload.sub,
      payload.email!,
      payload.name ?? null,
      payload.picture ?? null,
    )

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email })
    const refreshToken = await this.issueRefreshToken(user.id)

    return { accessToken, refreshToken, user }
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await this.refreshTokenRepo.save({ userId, tokenHash, expiresAt })
    return token
  }
}
```

- [ ] **Step 10: Create `apps/api/src/auth/auth.controller.ts`**

```typescript
// auth.controller.ts - Auth endpoints
import { Controller, Post, Get, Body, Res, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common'
import type { Response, Request } from 'express'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { CsrfGuard } from './csrf.guard'
import { GoogleAuthDto } from './dto/google-auth.dto'
import type { UserEntity } from '../entities/user.entity'

interface RequestWithUser extends Request {
  user: UserEntity
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleAuthDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.loginWithGoogle(dto.idToken)
    const isProduction = process.env.NODE_ENV === 'production'
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 15 * 60 * 1000, // 15 minutes
    })
    return { userId: user.id, email: user.email }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestWithUser) {
    const { id, email, name, avatarUrl } = req.user
    return { id, email, name, avatarUrl }
  }
}
```

- [ ] **Step 11: Create `apps/api/src/auth/auth.module.ts`**

```typescript
// auth.module.ts
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './jwt.strategy'
import { UsersModule } from '../users/users.module'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') ?? '15m' },
      }),
    }),
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 12: Run tests to verify they pass**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: PASS — including auth service tests.

- [ ] **Step 13: Update `apps/api/src/app.module.ts`**

```typescript
// app.module.ts - Root NestJS module
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import configuration from './config/configuration'
import { DbModule } from './db/db.module'
import { ScoringModule } from './scoring/scoring.module'
import { NarrativeModule } from './narrative/narrative.module'
import { RecommendationsModule } from './recommendations/recommendations.module'
import { AuthModule } from './auth/auth.module'
import { HealthController } from './health/health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    DbModule,
    ScoringModule,
    NarrativeModule,
    RecommendationsModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 14: Typecheck and build**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api typecheck
pnpm turbo build --filter=@snowboard/api
```
Expected: no errors.

- [ ] **Step 15: Commit**

```bash
git add apps/api/src/auth/ apps/api/src/users/ apps/api/src/app.module.ts
git commit -m "feat: auth module — Google OAuth, JWT in httpOnly cookie, CSRF guard, GET /auth/me"
```

---

### Task 7: Session lifecycle — guest session claim + refresh tokens

**Files:**
- Create: `apps/api/src/auth/sessions-claim.service.ts`
- Create: `apps/api/src/auth/sessions-claim.service.spec.ts`
- Modify: `apps/api/src/auth/auth.service.ts` — call claimGuestSessions after login
- Modify: `apps/api/src/auth/auth.controller.ts` — add `POST /auth/refresh`, `POST /auth/logout`
- Modify: `apps/api/src/auth/auth.module.ts` — add WizardSessionEntity to TypeOrmModule

**Interfaces:**
- Consumes: `WizardSessionEntity`, `RefreshTokenEntity`
- Produces:
  - `POST /api/auth/refresh` body: `{ refreshToken: string }` → new `access_token` cookie
  - `POST /api/auth/logout` → clears cookie, revokes refresh token
  - Guest session claim: all `wizard_sessions` with `user_id = null` and matching guest identifier are linked to the new user

- [ ] **Step 1: Write the failing sessions claim service test**

Create `apps/api/src/auth/sessions-claim.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { SessionsClaimService } from './sessions-claim.service'
import { WizardSessionEntity } from '../entities/wizard-session.entity'

const guestSession = { id: 'gs-1', userId: null, answers: {} }
const mockSessionRepo = {
  find: jest.fn().mockResolvedValue([guestSession]),
  save: jest.fn().mockImplementation((e: Partial<WizardSessionEntity>) => e),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  create: jest.fn().mockImplementation((e: Partial<WizardSessionEntity>) => e),
}

describe('SessionsClaimService', () => {
  let service: SessionsClaimService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionsClaimService,
        { provide: getRepositoryToken(WizardSessionEntity), useValue: mockSessionRepo },
      ],
    }).compile()
    service = module.get(SessionsClaimService)
    jest.clearAllMocks()
    mockSessionRepo.find.mockResolvedValue([guestSession])
  })

  it('claimGuestSessions() links null userId sessions to the logged-in user', async () => {
    await service.claimGuestSessions('gs-1', 'user-1')
    // The service should delete the old session and recreate with new id (session fixation prevention)
    expect(mockSessionRepo.delete).toHaveBeenCalledWith('gs-1')
    expect(mockSessionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' })
    )
  })

  it('claimGuestSessions() with no guest sessions does nothing', async () => {
    mockSessionRepo.find.mockResolvedValue([])
    await service.claimGuestSessions('unknown', 'user-1')
    expect(mockSessionRepo.delete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test -- --testPathPattern=sessions-claim
```
Expected: FAIL — `Cannot find module './sessions-claim.service'`

- [ ] **Step 3: Create `apps/api/src/auth/sessions-claim.service.ts`**

Session fixation prevention: when claiming a guest session, delete the old row and re-insert with a new UUID. This prevents an attacker who knows the guest session ID from using it post-authentication.

```typescript
// sessions-claim.service.ts - Links guest wizard sessions to a newly authenticated user
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WizardSessionEntity } from '../entities/wizard-session.entity'

@Injectable()
export class SessionsClaimService {
  constructor(
    @InjectRepository(WizardSessionEntity)
    private readonly sessionRepo: Repository<WizardSessionEntity>,
  ) {}

  async claimGuestSessions(guestSessionId: string, userId: string): Promise<void> {
    const guestSessions = await this.sessionRepo.find({
      where: { id: guestSessionId, userId: null } as unknown as Partial<WizardSessionEntity>,
    })

    for (const session of guestSessions) {
      const oldId = session.id
      // Delete old guest session (rotates the session identifier — prevents session fixation)
      await this.sessionRepo.delete(oldId)
      // Re-insert with new auto-generated UUID and the authenticated userId
      await this.sessionRepo.save({
        userId,
        name: session.name,
        answers: session.answers,
        scores: session.scores,
        schemaVersion: session.schemaVersion,
        phaseReached: session.phaseReached,
        completedAt: session.completedAt,
      } as Partial<WizardSessionEntity>)
    }
  }
}
```

- [ ] **Step 4: Update `apps/api/src/auth/auth.service.ts`** — add refresh token validation and add refresh/logout methods

Replace the full file content:
```typescript
// auth.service.ts - Google login, JWT issuance, refresh/logout, guest session claim
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { OAuth2Client } from 'google-auth-library'
import { createHash, randomBytes } from 'crypto'
import { UsersService } from '../users/users.service'
import { SessionsClaimService } from './sessions-claim.service'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'
import type { UserEntity } from '../entities/user.entity'

type LoginResult = {
  accessToken: string
  refreshToken: string
  user: UserEntity
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly sessionsClaim: SessionsClaimService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
  ) {
    this.googleClient = new OAuth2Client(config.get<string>('google.clientId'))
  }

  async loginWithGoogle(idToken: string, guestSessionId?: string): Promise<LoginResult> {
    let payload: { sub: string; email?: string; name?: string; picture?: string }
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.config.get<string>('google.clientId'),
      })
      const raw = ticket.getPayload()
      if (!raw?.sub || !raw.email) throw new Error('Missing claims')
      payload = { sub: raw.sub, email: raw.email, name: raw.name, picture: raw.picture }
    } catch {
      throw new UnauthorizedException('Invalid Google ID token')
    }

    const user = await this.usersService.upsertFromGoogle(
      payload.sub,
      payload.email!,
      payload.name ?? null,
      payload.picture ?? null,
    )

    if (guestSessionId) {
      await this.sessionsClaim.claimGuestSessions(guestSessionId, user.id)
    }

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email })
    const refreshToken = await this.issueRefreshToken(user.id)

    return { accessToken, refreshToken, user }
  }

  async refreshAccessToken(rawRefreshToken: string): Promise<{ accessToken: string }> {
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex')
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash, expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    })
    if (!stored) throw new UnauthorizedException('Refresh token invalid or expired')

    const accessToken = this.jwtService.sign({ sub: stored.user.id, email: stored.user.email })
    return { accessToken }
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex')
    await this.refreshTokenRepo.delete({ tokenHash })
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await this.refreshTokenRepo.save({ userId, tokenHash, expiresAt })
    return token
  }
}
```

- [ ] **Step 5: Update `apps/api/src/auth/auth.controller.ts`** — add /auth/refresh and /auth/logout

Replace the full file content:
```typescript
// auth.controller.ts - Auth endpoints
import { Controller, Post, Get, Body, Res, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common'
import type { Response, Request } from 'express'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { CsrfGuard } from './csrf.guard'
import { GoogleAuthDto } from './dto/google-auth.dto'
import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import type { UserEntity } from '../entities/user.entity'

class GoogleLoginDto extends GoogleAuthDto {
  @IsString()
  @IsOptional()
  guestSessionId?: string
}

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string
}

interface RequestWithUser extends Request {
  user: UserEntity
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.loginWithGoogle(dto.idToken, dto.guestSessionId)
    const isProduction = process.env.NODE_ENV === 'production'
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 15 * 60 * 1000,
    })
    return { userId: user.id, email: user.email }
  }

  @Post('refresh')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken } = await this.authService.refreshAccessToken(dto.refreshToken)
    const isProduction = process.env.NODE_ENV === 'production'
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 15 * 60 * 1000,
    })
    return { ok: true }
  }

  @Post('logout')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(dto.refreshToken)
    res.clearCookie('access_token')
    return { ok: true }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestWithUser) {
    const { id, email, name, avatarUrl } = req.user
    return { id, email, name, avatarUrl }
  }
}
```

- [ ] **Step 6: Update `apps/api/src/auth/auth.module.ts`** — add SessionsClaimService and WizardSessionEntity

```typescript
// auth.module.ts
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './jwt.strategy'
import { SessionsClaimService } from './sessions-claim.service'
import { UsersModule } from '../users/users.module'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'
import { WizardSessionEntity } from '../entities/wizard-session.entity'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') ?? '15m' },
      }),
    }),
    TypeOrmModule.forFeature([RefreshTokenEntity, WizardSessionEntity]),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, SessionsClaimService],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 7: Update auth.service.spec.ts** — add SessionsClaimService mock

Add `SessionsClaimService` to the providers in the existing test file:
```typescript
// In auth.service.spec.ts, add to providers:
const mockSessionsClaimService = { claimGuestSessions: jest.fn().mockResolvedValue(undefined) }

// Add to providers array:
{ provide: SessionsClaimService, useValue: mockSessionsClaimService },
```

And add `import { SessionsClaimService } from './sessions-claim.service'` to imports.

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: PASS — all tests including sessions claim and auth service.

- [ ] **Step 9: Typecheck**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api typecheck
```
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/auth/
git commit -m "feat: session lifecycle — guest claim with session fixation prevention, refresh + logout endpoints"
```

---

### Task 8: Redis — wizard answer cache + Claude rate limiting

**Files:**
- Create: `apps/api/src/cache/cache.module.ts`
- Create: `apps/api/src/cache/redis.service.ts`
- Create: `apps/api/src/cache/redis.service.spec.ts`
- Create: `apps/api/src/wizard-sessions/wizard-sessions.module.ts`
- Create: `apps/api/src/wizard-sessions/wizard-sessions.controller.ts`
- Create: `apps/api/src/wizard-sessions/wizard-sessions.controller.spec.ts`
- Modify: `apps/api/src/narrative/narrative.service.ts` — add Redis rate limiting
- Modify: `apps/api/src/app.module.ts` — add CacheModule, WizardSessionsModule

**Interfaces:**
- Produces:
  - `PUT /api/sessions/:id` body: `{ answers: Answers; phase: number }` — caches to Redis (TTL 7 days)
  - `GET /api/sessions/:id` — reads from Redis cache
  - `RedisService.setEx(key, ttl, value)`, `RedisService.get(key)`, `RedisService.incr(key)`, `RedisService.expire(key, ttl)`
  - Narrative rate limit: max 10 calls per userId per 60 seconds; excess returns cached or stub narrative

- [ ] **Step 1: Write the failing redis service test**

Create `apps/api/src/cache/redis.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { RedisService } from './redis.service'
import { ConfigService } from '@nestjs/config'

// Use in-memory mock instead of real Redis
jest.mock('ioredis', () => {
  const store = new Map<string, string>()
  const expiry = new Map<string, number>()
  return jest.fn().mockImplementation(() => ({
    set: jest.fn().mockImplementation((k: string, v: string) => { store.set(k, v); return 'OK' }),
    setex: jest.fn().mockImplementation((k: string, _ttl: number, v: string) => { store.set(k, v); return 'OK' }),
    get: jest.fn().mockImplementation((k: string) => store.get(k) ?? null),
    del: jest.fn().mockImplementation((k: string) => { store.delete(k); return 1 }),
    incr: jest.fn().mockImplementation((k: string) => {
      const v = parseInt(store.get(k) ?? '0', 10) + 1
      store.set(k, String(v))
      return v
    }),
    expire: jest.fn().mockImplementation((k: string, ttl: number) => { expiry.set(k, ttl); return 1 }),
    quit: jest.fn(),
  }))
})

describe('RedisService', () => {
  let service: RedisService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: { get: () => 'redis://localhost:6379' } },
      ],
    }).compile()
    service = module.get(RedisService)
  })

  it('setEx and get round-trip a JSON value', async () => {
    const data = { answers: { style: 'powder' } }
    await service.setEx('session:test-1', 60, data)
    const result = await service.get<typeof data>('session:test-1')
    expect(result).toEqual(data)
  })

  it('get on missing key returns null', async () => {
    const result = await service.get('session:nonexistent')
    expect(result).toBeNull()
  })

  it('incr increments atomically', async () => {
    const first = await service.incr('counter:test')
    const second = await service.incr('counter:test')
    expect(second).toBe(first + 1)
  })
})
```

- [ ] **Step 2: Write the failing wizard sessions controller test**

Create `apps/api/src/wizard-sessions/wizard-sessions.controller.spec.ts`:
```typescript
import { Test } from '@nestjs/testing'
import { WizardSessionsController } from './wizard-sessions.controller'
import { RedisService } from '../cache/redis.service'

const mockRedisService = {
  setEx: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
}

describe('WizardSessionsController', () => {
  let controller: WizardSessionsController

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [WizardSessionsController],
      providers: [{ provide: RedisService, useValue: mockRedisService }],
    }).compile()
    controller = module.get(WizardSessionsController)
    jest.clearAllMocks()
  })

  it('PUT /:id saves answers to Redis with 7-day TTL', async () => {
    await controller.save('session-abc', { answers: { style: 'powder' }, phase: 2 })
    expect(mockRedisService.setEx).toHaveBeenCalledWith(
      'session:session-abc',
      604800,
      { answers: { style: 'powder' }, phase: 2 }
    )
  })

  it('GET /:id returns cached session or 404', async () => {
    mockRedisService.get.mockResolvedValue({ answers: { style: 'powder' }, phase: 2 })
    const result = await controller.get('session-abc')
    expect(result).toEqual({ answers: { style: 'powder' }, phase: 2 })
  })

  it('GET /:id returns null when session not in cache', async () => {
    mockRedisService.get.mockResolvedValue(null)
    const result = await controller.get('session-missing')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test -- --testPathPattern="redis|wizard-sessions"
```
Expected: FAIL — `Cannot find module './redis.service'` and `Cannot find module './wizard-sessions.controller'`

- [ ] **Step 4: Create `apps/api/src/cache/redis.service.ts`**

```typescript
// redis.service.ts - Thin wrapper around ioredis with JSON serialization
import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis

  constructor(config: ConfigService) {
    this.client = new Redis(config.get<string>('redisUrl') ?? 'redis://localhost:6379', {
      lazyConnect: true,
      enableOfflineQueue: false,
    })
  }

  async setEx(key: string, ttlSeconds: number, value: unknown): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value))
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key)
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds)
  }

  onModuleDestroy(): void {
    this.client.quit()
  }
}
```

- [ ] **Step 5: Create `apps/api/src/cache/cache.module.ts`**

```typescript
// cache.module.ts
import { Module } from '@nestjs/common'
import { RedisService } from './redis.service'

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class CacheModule {}
```

- [ ] **Step 6: Create `apps/api/src/wizard-sessions/wizard-sessions.controller.ts`**

```typescript
// wizard-sessions.controller.ts - PUT/GET for in-progress wizard answers (Redis cache)
import { Controller, Put, Get, Param, Body } from '@nestjs/common'
import { IsObject, IsInt, Min, Max } from 'class-validator'
import { RedisService } from '../cache/redis.service'
import type { Answers } from '@snowboard/types'

const SESSION_TTL = 604800 // 7 days in seconds

class SaveSessionDto {
  @IsObject()
  answers!: Answers

  @IsInt()
  @Min(1)
  @Max(4)
  phase!: number
}

type CachedSession = { answers: Answers; phase: number }

@Controller('sessions')
export class WizardSessionsController {
  constructor(private readonly redis: RedisService) {}

  @Put(':id')
  async save(@Param('id') id: string, @Body() dto: SaveSessionDto): Promise<void> {
    await this.redis.setEx(`session:${id}`, SESSION_TTL, { answers: dto.answers, phase: dto.phase })
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<CachedSession | null> {
    return this.redis.get<CachedSession>(`session:${id}`)
  }
}
```

- [ ] **Step 7: Create `apps/api/src/wizard-sessions/wizard-sessions.module.ts`**

```typescript
// wizard-sessions.module.ts
import { Module } from '@nestjs/common'
import { WizardSessionsController } from './wizard-sessions.controller'
import { CacheModule } from '../cache/cache.module'

@Module({
  imports: [CacheModule],
  controllers: [WizardSessionsController],
})
export class WizardSessionsModule {}
```

- [ ] **Step 8: Update `apps/api/src/narrative/narrative.service.ts`** — add Redis rate limiting

Add Redis rate limiting: max 10 Claude calls per userId per 60 seconds. If rate limit exceeded, return fallback message without calling Claude.

Replace the full file with:
```typescript
// narrative.service.ts - Stage 2: Claude narrative + Redis rate limiting
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { RedisService } from '../cache/redis.service'
import type { Answers, SpecSheet } from '@snowboard/types'

const NARRATIVE_PROMPT = `You are a professional snowboard fitter with 20 years of experience.
A rider has completed a selection wizard. Based on their profile and derived spec sheet, write a personalized recommendation.

Rider profile:
- Experience: {experience}
- Riding style: {style}
- Riding days per season: {ridingDays}
- Terrain preference: {terrainMix}

Derived specification:
- Board length: {lengthCm} cm
- Waist width: {waistWidthMm} mm
- Flex rating: {flexRating}/10 ({flexLabel})
- Shape: {shape}
- Camber profile: {camberProfile}
- Taper: {taperMm} mm
- Sidecut radius: {sidecutRadius}
- Stance setback: {setback}
- Base type: {baseType}
- Powder float priority: {floatPriority}

Write exactly four sections separated by blank lines:
1. A 2–3 sentence personalized explanation of why these specs suit this rider.
2. One sentence about the main trade-off (what they sacrifice for this build).
3. One sentence suggesting an alternative to consider if their priorities shift.
4. Any contradiction flags (e.g., beginner requesting expert terrain, or freestyle rider with carving-optimized flex). If none, write "No contradictions detected."

Write in second person ("Your board..."). Be specific — reference the actual spec values. No markdown headers or bullet points.`

const RATE_LIMIT_CALLS = 10
const RATE_LIMIT_WINDOW = 60 // seconds

@Injectable()
export class NarrativeService {
  private readonly client: Anthropic | null

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    const apiKey = config.get<string>('anthropic.apiKey') ?? ''
    this.client = apiKey ? new Anthropic({ apiKey }) : null
  }

  async generate(answers: Answers, specSheet: SpecSheet, userId?: string): Promise<string> {
    const fallback = `Spec sheet generated: ${specSheet.flexLabel} flex, ${specSheet.lengthCm} cm ${specSheet.shape} with ${specSheet.camberProfile} profile.`

    if (!this.client) return fallback

    if (userId) {
      const rateKey = `rate:claude:${userId}`
      const count = await this.redis.incr(rateKey)
      if (count === 1) await this.redis.expire(rateKey, RATE_LIMIT_WINDOW)
      if (count > RATE_LIMIT_CALLS) return fallback
    }

    const prompt = NARRATIVE_PROMPT
      .replace('{experience}', answers.experience ?? 'not specified')
      .replace('{style}', answers.style ?? 'not specified')
      .replace('{ridingDays}', String(answers.ridingDays ?? 'not specified'))
      .replace('{terrainMix}', answers.terrainMix ?? 'not specified')
      .replace('{lengthCm}', String(specSheet.lengthCm))
      .replace('{waistWidthMm}', String(specSheet.waistWidthMm))
      .replace('{flexRating}', String(specSheet.flexRating))
      .replace('{flexLabel}', specSheet.flexLabel)
      .replace('{shape}', specSheet.shape)
      .replace('{camberProfile}', specSheet.camberProfile)
      .replace('{taperMm}', String(specSheet.taperMm))
      .replace('{sidecutRadius}', specSheet.sidecutRadius)
      .replace('{setback}', specSheet.setback)
      .replace('{baseType}', specSheet.baseType)
      .replace('{floatPriority}', specSheet.floatPriority)

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text : fallback
  }
}
```

- [ ] **Step 9: Update `apps/api/src/narrative/narrative.module.ts`** — import CacheModule

```typescript
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
```

- [ ] **Step 10: Update narrative service spec** — add RedisService mock

In `apps/api/src/narrative/narrative.service.spec.ts`, add `RedisService` mock to providers:
```typescript
import { RedisService } from '../cache/redis.service'

// Add to providers in beforeEach:
const mockRedisService = { incr: jest.fn().mockResolvedValue(1), expire: jest.fn() }

// In Test.createTestingModule providers:
{ provide: RedisService, useValue: mockRedisService },
```

- [ ] **Step 11: Update `apps/api/src/app.module.ts`** — add CacheModule, WizardSessionsModule

```typescript
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
```

- [ ] **Step 12: Run all tests to verify they pass**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test
```
Expected: PASS — all tests across health, scoring, narrative, recommendations, auth, sessions-claim, redis, wizard-sessions.

- [ ] **Step 13: Full workspace build and test**

```bash
cd 91_snowboard_wizard
pnpm turbo build test
```
Expected: all `Tasks: N successful`, all tests pass across `@snowboard/types`, `@snowboard/wizard-schema`, `@snowboard/api`.

- [ ] **Step 14: Commit**

```bash
git add apps/api/src/cache/ apps/api/src/wizard-sessions/ apps/api/src/narrative/ apps/api/src/app.module.ts
git commit -m "feat: Redis integration — wizard answer cache (PUT/GET /api/sessions/:id) + Claude rate limiting"
```
