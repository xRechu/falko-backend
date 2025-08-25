/**
 * Konfiguracja wyszukiwania: włączenie rozszerzenia pg_trgm i indeksów
 * Uruchom: npm run setup:search (wykona medusa exec)
 */

import { Client } from 'pg'

export default async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    console.log('🔧 Enabling pg_trgm and creating indexes...')

    // Enable extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)

    // Indexes for fuzzy/ILIKE
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_title_trgm'
        ) THEN
          CREATE INDEX idx_product_title_trgm ON product USING GIN (title gin_trgm_ops);
        END IF;
      END$$;
    `)

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_product_desc_trgm'
        ) THEN
          CREATE INDEX idx_product_desc_trgm ON product USING GIN (description gin_trgm_ops);
        END IF;
      END$$;
    `)

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_variant_title_trgm'
        ) THEN
          CREATE INDEX idx_variant_title_trgm ON product_variant USING GIN (title gin_trgm_ops);
        END IF;
      END$$;
    `)

    console.log('✅ Search configuration completed')
  } catch (e) {
    console.error('❌ Failed to setup search', e)
    throw e
  } finally {
    await client.end()
  }
}
