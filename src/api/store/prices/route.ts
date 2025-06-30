import { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"

/**
 * Endpoint do pobierania cen wariantów produktów
 * Dostępny publicznie dla Store API
 * Używa właściwych tabel price_set z Medusa v2
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    console.log('🔄 Fetching prices data from database...');

    // W Medusa v2 używamy raw SQL żeby pobrać ceny z price_set
    const query = `
      SELECT 
        pv.id as variant_id,
        p.amount,
        p.currency_code,
        p.min_quantity,
        p.max_quantity,
        p.id as price_id
      FROM product_variant pv
      JOIN product_variant_price_set pvps ON pv.id = pvps.variant_id  
      JOIN price_set ps ON pvps.price_set_id = ps.id
      JOIN price p ON ps.id = p.price_set_id
      WHERE pv.deleted_at IS NULL
        AND p.deleted_at IS NULL
      ORDER BY pv.id, p.currency_code
    `;

    // Wykonaj raw SQL query
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    await client.connect();
    const result = await client.query(query);
    await client.end();

    console.log(`📦 Found ${result.rows.length} price records`);

    // Grupuj ceny po variant_id
    const pricesMap: Record<string, any[]> = {};
    
    for (const row of result.rows) {
      if (!pricesMap[row.variant_id]) {
        pricesMap[row.variant_id] = [];
      }
      
      pricesMap[row.variant_id].push({
        id: row.price_id,
        currency_code: row.currency_code,
        amount: parseInt(row.amount),
        min_quantity: row.min_quantity || undefined,
        max_quantity: row.max_quantity || undefined
      });
    }

    console.log(`✅ Prepared prices for ${Object.keys(pricesMap).length} variants`);
    
    res.json({
      prices: pricesMap
    })
  } catch (error) {
    console.error('❌ Error fetching prices:', error)
    res.status(500).json({
      error: "Failed to fetch prices data",
      details: error?.message || 'Unknown error'
    })
  }
}
