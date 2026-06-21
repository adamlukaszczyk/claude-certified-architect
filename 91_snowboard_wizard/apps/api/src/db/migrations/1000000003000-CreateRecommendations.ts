import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateRecommendations1000000003000 implements MigrationInterface {
  name = 'CreateRecommendations1000000003000'

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
