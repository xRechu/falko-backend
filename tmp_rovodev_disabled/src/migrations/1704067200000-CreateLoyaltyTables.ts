import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateLoyaltyTables1704067200000 implements MigrationInterface {
    name = 'CreateLoyaltyTables1704067200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create loyalty_accounts table
        await queryRunner.query(`
            CREATE TABLE "loyalty_accounts" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "customer_id" character varying NOT NULL,
                "total_points" integer NOT NULL DEFAULT 0,
                "lifetime_earned" integer NOT NULL DEFAULT 0,
                "lifetime_spent" integer NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_loyalty_accounts" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_loyalty_accounts_customer" UNIQUE ("customer_id")
            )
        `)

        // Create loyalty_transactions table
        await queryRunner.query(`
            CREATE TABLE "loyalty_transactions" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "customer_id" character varying NOT NULL,
                "type" character varying NOT NULL CHECK ("type" IN ('earned', 'spent', 'refunded')),
                "points" integer NOT NULL,
                "description" text NOT NULL,
                "order_id" character varying,
                "reward_id" character varying,
                "metadata" jsonb DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_loyalty_transactions" PRIMARY KEY ("id")
            )
        `)

        // Create loyalty_rewards table
        await queryRunner.query(`
            CREATE TABLE "loyalty_rewards" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "title" character varying NOT NULL,
                "description" text,
                "points_cost" integer NOT NULL,
                "category" character varying NOT NULL,
                "discount_amount" decimal(10,2),
                "discount_percentage" integer,
                "product_id" character varying,
                "valid_until" TIMESTAMP,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_loyalty_rewards" PRIMARY KEY ("id")
            )
        `)

        // Create indexes for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_loyalty_accounts_customer" ON "loyalty_accounts" ("customer_id")
        `)
        
        await queryRunner.query(`
            CREATE INDEX "IDX_loyalty_transactions_customer" ON "loyalty_transactions" ("customer_id")
        `)
        
        await queryRunner.query(`
            CREATE INDEX "IDX_loyalty_transactions_order" ON "loyalty_transactions" ("order_id")
        `)
        
        await queryRunner.query(`
            CREATE INDEX "IDX_loyalty_transactions_type" ON "loyalty_transactions" ("type")
        `)

        console.log('✅ Loyalty tables created successfully')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_loyalty_transactions_type"`)
        await queryRunner.query(`DROP INDEX "IDX_loyalty_transactions_order"`)
        await queryRunner.query(`DROP INDEX "IDX_loyalty_transactions_customer"`)
        await queryRunner.query(`DROP INDEX "IDX_loyalty_accounts_customer"`)
        await queryRunner.query(`DROP TABLE "loyalty_rewards"`)
        await queryRunner.query(`DROP TABLE "loyalty_transactions"`)
        await queryRunner.query(`DROP TABLE "loyalty_accounts"`)
        
        console.log('✅ Loyalty tables dropped successfully')
    }
}