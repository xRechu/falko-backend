import { Client } from 'pg'

async function main() {
  const conn = process.env.DATABASE_URL
  if (!conn) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }
  const client = new Client({ connectionString: conn })
  await client.connect()
  const log = (...a: any[]) => console.log(...a)
  const q = async (sql: string, params?: any[]) => {
    try { return await client.query(sql, params) } catch (e: any) { log('ERR:', e.message); return { rows: [] as any[] } }
  }

  log('== Schemat public: lista tabel ==')
  const tables = await q("select table_name from information_schema.tables where table_schema='public' order by table_name")
  log(tables.rows.map(r=>r.table_name).join('\n'))

  const targets = ['product','product_variant','product_category','product_category_product','product_option','product_option_value','product_variant_price_set','price_set','price']
  for (const t of targets) {
    log(`\n== Kolumny: ${t} ==`)
    const cols = await q("select column_name, data_type from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position", [t])
    if (!cols.rows.length) { log('(brak tabeli)'); continue }
    for (const c of cols.rows) log(`${c.column_name} : ${c.data_type}`)
    const count = await q(`select count(*) as c from ${t}`)
    log(`(liczba wierszy: ${count.rows?.[0]?.c || 0})`)
  }

  log('\n== Próbka product (5) ==')
  log((await q('select id, title, handle, thumbnail from product order by created_at desc limit 5')).rows)

  log('\n== Próbka product_variant (5) ==')
  log((await q('select id, product_id, title from product_variant order by created_at desc limit 5')).rows)

  await client.end()
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })
