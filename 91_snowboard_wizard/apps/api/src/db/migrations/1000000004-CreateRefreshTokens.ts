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
