import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateUsers1000000001000 implements MigrationInterface {
  name = 'CreateUsers1000000001000'

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
