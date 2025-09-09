import { Client } from 'pg'

const SEED = [
  {
    title: '50 PLN Zniżka',
    description: 'Zniżka 50 PLN na następne zakupy',
    points_cost: 500,
    category: 'discount',
    discount_amount: 50,
    discount_percentage: null,
    product_id: null,
    valid_until: null,
    is_active: true,
  },
  {
    title: 'Darmowa dostawa',
    description: 'Bezpłatna dostawa na następne zamówienie',
    points_cost: 300,
    category: 'shipping',
    discount_amount: null,
    discount_percentage: null,
    product_id: null,
    valid_until: null,
    is_active: true,
  },
]

async function run() {
  const conn = process.env.DATABASE_URL
  if (!conn) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    console.log('Seeding loyalty_rewards...')
    for (const r of SEED) {
      await client.query(
        `insert into loyalty_rewards 
         (title, description, points_cost, category, discount_amount, discount_percentage, product_id, valid_until, is_active)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict do nothing`,
        [
          r.title,
          r.description,
          r.points_cost,
          r.category,
          r.discount_amount,
          r.discount_percentage,
          r.product_id,
          r.valid_until,
          r.is_active,
        ]
      )
    }
    const { rows } = await client.query('select count(*)::int as c from loyalty_rewards')
    console.log(`Done. loyalty_rewards count = ${rows?.[0]?.c ?? 0}`)
  } finally {
    await client.end()
  }
}
export default async function () {
  await run()
}
