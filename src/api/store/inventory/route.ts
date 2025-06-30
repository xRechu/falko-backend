import { 
  MedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http"

/**
 * Endpoint do pobierania stanów magazynowych wariantów produktów
 * Dostępny publicznie dla Store API
 * Używa właściwych tabel inventory z Medusa v2
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    console.log('🔄 Fetching inventory data from database...');

    // W Medusa v2 używamy raw SQL żeby pobrać inventory z połączonych tabel
    const query = `
      SELECT 
        pv.id as variant_id,
        pv.manage_inventory,
        pv.allow_backorder,
        COALESCE(il.stocked_quantity, 0) as stocked_quantity,
        COALESCE(il.reserved_quantity, 0) as reserved_quantity,
        CASE 
          WHEN pv.manage_inventory = false THEN true
          WHEN pv.allow_backorder = true THEN true
          WHEN COALESCE(il.stocked_quantity, 0) - COALESCE(il.reserved_quantity, 0) > 0 THEN true
          ELSE false
        END as is_available
      FROM product_variant pv
      LEFT JOIN product_variant_inventory_item pvi ON pv.id = pvi.variant_id
      LEFT JOIN inventory_level il ON pvi.inventory_item_id = il.inventory_item_id
      WHERE pv.deleted_at IS NULL
    `;

    // Wykonaj raw SQL query
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    await client.connect();
    const result = await client.query(query);
    await client.end();

    console.log(`📦 Found ${result.rows.length} variants with inventory data`);

    // Mapuj dane do naszego formatu API
    const inventoryMap: Record<string, {
      inventory_quantity: number
      manage_inventory: boolean
      allow_backorder: boolean
      is_available: boolean
    }> = {};

    for (const row of result.rows) {
      const availableQuantity = parseInt(row.stocked_quantity) - parseInt(row.reserved_quantity);
      
      inventoryMap[row.variant_id] = {
        inventory_quantity: availableQuantity,
        manage_inventory: row.manage_inventory,
        allow_backorder: row.allow_backorder,
        is_available: row.is_available
      };
    }

    console.log(`✅ Prepared inventory data for ${Object.keys(inventoryMap).length} variants`);
    
    res.json({
      inventory: inventoryMap
    })
  } catch (error) {
    console.error('❌ Error fetching inventory:', error)
    res.status(500).json({
      error: "Failed to fetch inventory data",
      details: error?.message || 'Unknown error'
    })
  }
}
