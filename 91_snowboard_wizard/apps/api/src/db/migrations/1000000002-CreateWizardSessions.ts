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
