import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Helper: parse CSV query param into array
const parseCSV = (v?: string | string[]) => {
  if (!v) return [] as string[]
  const s = Array.isArray(v) ? v.join(",") : v
  return s.split(",").map((x) => x.trim()).filter(Boolean)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = (req.query.q as string) || ""
  const category = (req.query.category as string) || undefined
  const sizes = parseCSV(req.query.sizes as string | string[])
  const priceMin = req.query.price_min ? Number(req.query.price_min) : undefined
  const priceMax = req.query.price_max ? Number(req.query.price_max) : undefined
  const sort = (req.query.sort as string) || (q ? "relevance" : "created_at_desc")
  const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1
  const limit = req.query.limit ? Math.min(100, Number(req.query.limit)) : 24
  const currency = (req.query.currency as string) || "pln"
  const offset = (page - 1) * limit

  const hasQ = !!q
  const hasCategory = !!category
  const hasSizes = sizes.length > 0
  const hasPriceMin = priceMin !== undefined
  const hasPriceMax = priceMax !== undefined

  // Common snippets
  const baseDeleted = ["p.deleted_at IS NULL", "v.deleted_at IS NULL"]

  // Build WHERE and params for a given config
  const buildWhereAndParams = (opts: { includeCategory: boolean; includeSizes: boolean; includeQ: boolean }) => {
    const where: string[] = [...baseDeleted]
    const params: any[] = []

    // q
    if (opts.includeQ && hasQ) {
      params.push(`%${q}%`)
      const i = params.length
      where.push(`(p.title ILIKE $${i} OR v.title ILIKE $${i} OR p.description ILIKE $${i})`)
    }
    // category
    const joins: { category: string; sizes: string } = { category: "", sizes: "" }
    if (opts.includeCategory && hasCategory) {
      joins.category = `JOIN product_category_product pcp ON pcp.product_id = p.id JOIN product_category pc_filter ON pc_filter.id = pcp.product_category_id`
      params.push(category)
      const i = params.length
      where.push(`(pc_filter.id = $${i} OR pc_filter.name = $${i})`)
    }
    // sizes
    if (opts.includeSizes && hasSizes) {
      joins.sizes = `JOIN product_variant_option pvo_f ON pvo_f.variant_id = v.id
                     JOIN product_option_value pov_f ON pov_f.id = pvo_f.option_value_id
                     JOIN product_option po_f ON po_f.id = pov_f.option_id AND LOWER(po_f.title) = 'size'`
      params.push(sizes)
      const i = params.length
      where.push(`pov_f.value = ANY($${i})`)
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
    return { whereSql, params, joins }
  }

  // Sorting using CTE aliases
  let orderSql = "created_at DESC"
  let relevanceLikeIdx: number | null = null

  // Main list WHERE/params (include all filters)
  const list = buildWhereAndParams({ includeCategory: true, includeSizes: true, includeQ: true })

  if (sort === "price_asc") orderSql = "min_price ASC NULLS LAST"
  if (sort === "price_desc") orderSql = "min_price DESC NULLS LAST"
  if (sort === "created_at_asc") orderSql = "created_at ASC"
  if (sort === "relevance" && hasQ) {
    list.params.push(`%${q}%`)
    relevanceLikeIdx = list.params.length
    orderSql = `(CASE WHEN title ILIKE $${relevanceLikeIdx} THEN 0 ELSE 1 END), created_at DESC`
  }

  // Currency and price filters for list/count
  list.params.push(currency)
  const currIdxList = list.params.length
  const priceFilters: string[] = []
  if (hasPriceMin) {
    list.params.push(priceMin)
    priceFilters.push(`min_price >= $${list.params.length}`)
  }
  if (hasPriceMax) {
    list.params.push(priceMax)
    priceFilters.push(`min_price <= $${list.params.length}`)
  }
  const priceFilterSql = priceFilters.length ? `AND ${priceFilters.join(" AND ")}` : ""

  const itemsQuery = `
    WITH base AS (
      SELECT 
        p.id as product_id,
        p.title,
        p.thumbnail,
        p.handle,
        p.created_at as created_at,
        v.id as variant_id,
        v.title as variant_title,
        (
          SELECT MIN(pz.amount)::int
          FROM product_variant_price_set pvps
          JOIN price_set ps ON ps.id = pvps.price_set_id AND pvps.variant_id = v.id
          JOIN price pz ON pz.price_set_id = ps.id AND pz.currency_code = $${currIdxList}
        ) as min_price
      FROM product p
      JOIN product_variant v ON v.product_id = p.id
      ${list.joins.category}
      ${list.joins.sizes}
      ${list.whereSql}
    )
    SELECT * FROM base
    WHERE 1=1 ${priceFilterSql}
    ORDER BY ${orderSql}
    LIMIT ${limit} OFFSET ${offset}
  `

  const countParams = [...list.params]
  const countQuery = `
    WITH base AS (
      SELECT DISTINCT p.id,
        (
          SELECT MIN(pz.amount)::int
          FROM product_variant_price_set pvps
          JOIN price_set ps ON ps.id = pvps.price_set_id AND pvps.variant_id = v.id
          JOIN price pz ON pz.price_set_id = ps.id AND pz.currency_code = $${currIdxList}
        ) as min_price
      FROM product p
      JOIN product_variant v ON v.product_id = p.id
      ${list.joins.category}
      ${list.joins.sizes}
      ${list.whereSql}
    )
    SELECT COUNT(*)::int AS count FROM base WHERE 1=1 ${priceFilterSql}
  `

  // Categories facet: include q and sizes, exclude category
  const cat = buildWhereAndParams({ includeCategory: false, includeSizes: true, includeQ: true })
  const categoriesFacetQuery = `
    WITH filtered AS (
      SELECT DISTINCT p.id
      FROM product p
      JOIN product_variant v ON v.product_id = p.id
      ${cat.joins.sizes}
      ${cat.whereSql}
    )
    SELECT pc.id, pc.name, COUNT(DISTINCT p.id)::int AS count
    FROM filtered f
    JOIN product p ON p.id = f.id
    JOIN product_category_product pcp ON pcp.product_id = p.id
    JOIN product_category pc ON pc.id = pcp.product_category_id
    GROUP BY pc.id, pc.name
    ORDER BY count DESC
  `

  // Sizes facet: include q and category, exclude sizes
  const siz = buildWhereAndParams({ includeCategory: true, includeSizes: false, includeQ: true })
  const sizesFacetQuery = `
    WITH filtered AS (
      SELECT DISTINCT p.id
      FROM product p
      JOIN product_variant v ON v.product_id = p.id
      ${siz.joins.category}
      ${siz.whereSql}
    )
    SELECT pov.value AS size, COUNT(DISTINCT v.id)::int AS count
    FROM filtered f
    JOIN product p ON p.id = f.id
    JOIN product_variant v ON v.product_id = p.id
    JOIN product_variant_option pvo ON pvo.variant_id = v.id
    JOIN product_option_value pov ON pov.id = pvo.option_value_id
    JOIN product_option po ON po.id = pov.option_id AND LOWER(po.title) = 'size'
    GROUP BY pov.value
    ORDER BY count DESC
  `

  // Price facet: include all filters, needs currency
  const price = buildWhereAndParams({ includeCategory: true, includeSizes: true, includeQ: true })
  price.params.push(currency)
  const currIdxPrice = price.params.length
  const priceFacetQuery = `
    WITH base AS (
      SELECT DISTINCT v.id,
        (
          SELECT MIN(pz.amount)::int
          FROM product_variant_price_set pvps
          JOIN price_set ps ON ps.id = pvps.price_set_id AND pvps.variant_id = v.id
          JOIN price pz ON pz.price_set_id = ps.id AND pz.currency_code = $${currIdxPrice}
        ) as min_price
      FROM product p
      JOIN product_variant v ON v.product_id = p.id
      ${price.joins.category}
      ${price.joins.sizes}
      ${price.whereSql}
    )
    SELECT 
      COALESCE(MIN(min_price), 0)::int AS min,
      COALESCE(MAX(min_price), 0)::int AS max
    FROM base
  `

  const { Client } = require('pg')
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    const [itemsRes, countRes, catRes, sizeRes, priceRes] = await Promise.all([
      client.query(itemsQuery, list.params),
      client.query(countQuery, countParams),
      client.query(categoriesFacetQuery, cat.params),
      client.query(sizesFacetQuery, siz.params),
      client.query(priceFacetQuery, price.params),
    ])

    const total = countRes.rows?.[0]?.count || 0

    res.json({
      items: itemsRes.rows,
      pagination: { total, page, limit },
      facets: {
        categories: catRes.rows,
        sizes: sizeRes.rows,
        price: priceRes.rows?.[0] || { min: 0, max: 0 }
      }
    })
  } catch (e: any) {
    console.error('❌ Search error', e)
    res.status(500).json({ error: 'Search failed', details: e.message })
  } finally {
    await client.end()
  }
}
