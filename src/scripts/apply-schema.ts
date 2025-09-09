import { Client } from 'pg'

const SQL = {
  loyalty_accounts: `
    CREATE TABLE IF NOT EXISTS loyalty_accounts (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      customer_id varchar NOT NULL,
      total_points integer NOT NULL DEFAULT 0,
      lifetime_earned integer NOT NULL DEFAULT 0,
      lifetime_spent integer NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      updated_at TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT PK_loyalty_accounts PRIMARY KEY (id),
      CONSTRAINT UQ_loyalty_accounts_customer UNIQUE (customer_id)
    );
    CREATE INDEX IF NOT EXISTS IDX_loyalty_accounts_customer ON loyalty_accounts (customer_id);
  `,
  loyalty_transactions: `
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      customer_id varchar NOT NULL,
      type varchar NOT NULL CHECK (type IN ('earned','spent','refunded')),
      points integer NOT NULL,
      description text NOT NULL,
      order_id varchar,
      reward_id varchar,
      metadata jsonb DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT PK_loyalty_transactions PRIMARY KEY (id)
    );
    CREATE INDEX IF NOT EXISTS IDX_loyalty_transactions_customer ON loyalty_transactions (customer_id);
    CREATE INDEX IF NOT EXISTS IDX_loyalty_transactions_order ON loyalty_transactions (order_id);
    CREATE INDEX IF NOT EXISTS IDX_loyalty_transactions_type ON loyalty_transactions (type);
  `,
  loyalty_rewards: `
    CREATE TABLE IF NOT EXISTS loyalty_rewards (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      title varchar NOT NULL,
      description text,
      points_cost integer NOT NULL,
      category varchar NOT NULL,
      discount_amount decimal(10,2),
      discount_percentage integer,
      product_id varchar,
      valid_until TIMESTAMP,
      is_active boolean NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT PK_loyalty_rewards PRIMARY KEY (id)
    );
  `,
  returns: `
    CREATE TABLE IF NOT EXISTS returns (
      id varchar NOT NULL,
      order_id varchar NOT NULL,
      customer_id varchar NOT NULL,
      status varchar NOT NULL DEFAULT 'pending_survey',
      reason_code varchar,
      refund_method varchar NOT NULL DEFAULT 'card',
      items jsonb NOT NULL DEFAULT '[]',
      total_amount integer NOT NULL,
      refund_amount integer,
      furgonetka_qr_code text,
      furgonetka_tracking_number varchar,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL,
      processed_at TIMESTAMPTZ,
      CONSTRAINT PK_returns PRIMARY KEY (id)
    );
    CREATE INDEX IF NOT EXISTS IDX_returns_order_id ON returns (order_id);
    CREATE INDEX IF NOT EXISTS IDX_returns_customer_id ON returns (customer_id);
    CREATE INDEX IF NOT EXISTS IDX_returns_status ON returns (status);
    CREATE INDEX IF NOT EXISTS IDX_returns_created_at ON returns (created_at);
    CREATE INDEX IF NOT EXISTS IDX_returns_expires_at ON returns (expires_at);
  `,
  return_surveys: `
    CREATE TABLE IF NOT EXISTS return_surveys (
      id varchar NOT NULL,
      return_id varchar NOT NULL,
      reason_code varchar NOT NULL,
      satisfaction_rating integer,
      size_issue varchar,
      quality_issue varchar,
      description text,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT PK_return_surveys PRIMARY KEY (id)
    );
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_return_surveys_return_id'
      ) THEN
        ALTER TABLE return_surveys
          ADD CONSTRAINT FK_return_surveys_return_id
          FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `,
}

async function run() {
  const conn = process.env.DATABASE_URL
  if (!conn) throw new Error('DATABASE_URL not set')
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const exec = async (label: string, sql: string) => {
    console.log(`Applying: ${label} ...`)
    await client.query(sql)
    console.log(`Done: ${label}`)
  }
  try {
    // Ensure pgcrypto exists for gen_random_uuid
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
    await exec('loyalty_accounts', SQL.loyalty_accounts)
    await exec('loyalty_transactions', SQL.loyalty_transactions)
    await exec('loyalty_rewards', SQL.loyalty_rewards)
    await exec('returns', SQL.returns)
    await exec('return_surveys', SQL.return_surveys)
    console.log('Schema applied successfully ✅')
  } finally {
    await client.end()
  }
}

export default async function () {
  await run()
}
