import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateReturnsTables1704067300000 implements MigrationInterface {
    name = 'CreateReturnsTables1704067300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create returns table
        await queryRunner.query(`
            CREATE TABLE "returns" (
                "id" character varying NOT NULL,
                "order_id" character varying NOT NULL,
                "customer_id" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending_survey',
                "reason_code" character varying,
                "refund_method" character varying NOT NULL DEFAULT 'card',
                "items" jsonb NOT NULL DEFAULT '[]',
                "total_amount" integer NOT NULL,
                "refund_amount" integer,
                "furgonetka_qr_code" text,
                "furgonetka_tracking_number" character varying,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "processed_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_returns" PRIMARY KEY ("id")
            )
        `);

        // Create return_surveys table
        await queryRunner.query(`
            CREATE TABLE "return_surveys" (
                "id" character varying NOT NULL,
                "return_id" character varying NOT NULL,
                "reason_code" character varying NOT NULL,
                "satisfaction_rating" integer,
                "size_issue" character varying,
                "quality_issue" character varying,
                "description" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_return_surveys" PRIMARY KEY ("id"),
                CONSTRAINT "FK_return_surveys_return_id" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE CASCADE
            )
        `);

        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_returns_order_id" ON "returns" ("order_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_returns_customer_id" ON "returns" ("customer_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_returns_status" ON "returns" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_returns_created_at" ON "returns" ("created_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_returns_expires_at" ON "returns" ("expires_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_returns_expires_at"`);
        await queryRunner.query(`DROP INDEX "IDX_returns_created_at"`);
        await queryRunner.query(`DROP INDEX "IDX_returns_status"`);
        await queryRunner.query(`DROP INDEX "IDX_returns_customer_id"`);
        await queryRunner.query(`DROP INDEX "IDX_returns_order_id"`);
        await queryRunner.query(`DROP TABLE "return_surveys"`);
        await queryRunner.query(`DROP TABLE "returns"`);
    }
}