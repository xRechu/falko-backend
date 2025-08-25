import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = (req.query.q as string) || ""
  const limit = req.query.limit ? Math.min(20, Number(req.query.limit)) : 8

  if (!q || q.length < 2) {
    return res.json({ suggestions: [] })
  }

  const params: any[] = [`%${q}%`, `%${q}%`, `%${q}%`, limit]
  const query = `
    SELECT DISTINCT p.title as label, p.handle as handle, 'product' as type
    FROM product p
    WHERE p.deleted_at IS NULL AND p.title ILIKE $1
    UNION
    SELECT DISTINCT v.title as label, p.handle as handle, 'variant' as type
    FROM product_variant v
    JOIN product p ON p.id = v.product_id
    WHERE v.deleted_at IS NULL AND p.deleted_at IS NULL AND v.title ILIKE $2
    UNION
    SELECT DISTINCT pc.name as label, pc.id as handle, 'category' as type
    FROM product_category pc
    WHERE pc.deleted_at IS NULL AND pc.name ILIKE $3
    LIMIT $4
  `

  const { Client } = require('pg')
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    const result = await client.query(query, params)
    res.json({ suggestions: result.rows })
  } catch (e: any) {
    console.error('❌ Suggest error', e)
    res.status(500).json({ error: 'Suggest failed', details: e.message })
  } finally {
    await client.end()
  }
}
