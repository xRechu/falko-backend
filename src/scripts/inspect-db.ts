import { Client } from 'pg'

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    console.log('DB URL present:', !!process.env.DATABASE_URL)

    console.log('\n== Public tables (subset: product/price/category/option) ==')
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema='public' 
        AND table_type='BASE TABLE'
        AND (
          table_name ILIKE 'product%'
          OR table_name ILIKE 'price%'
          OR table_name ILIKE 'category%'
          OR table_name ILIKE 'cart%'
        )
      ORDER BY table_name;
    `)
    for (const r of tables.rows) console.log(' -', r.table_name)

    async function describe(table: string) {
      const cols = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
        [table]
      )
      console.log(`\n-- ${table} columns --`)
      cols.rows.forEach((c) => console.log(`${c.column_name} : ${c.data_type}`))
      try {
        const sample = await client.query(`SELECT * FROM ${table} LIMIT 3`)
        console.log(`sample rows: ${sample.rowCount}`)
        if (sample.rows.length) console.dir(sample.rows, { depth: 1 })
      } catch (e: any) {
        console.log(`sample query failed for ${table}:`, e.message)
      }
    }

    const candidates = [
      'product',
      'product_variant',
      'product_option',
      'product_option_value',
      'product_category',
      'product_category_product',
      'price',
      'price_set',
      'product_variant_price_set',
    ]

    for (const t of candidates) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
        [t]
      )
      if (exists.rowCount) {
        await describe(t)
      } else {
        console.log(`\n-- ${t} (NOT FOUND) --`)
      }
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('inspect-db failed', e)
  process.exit(1)
})
