import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// CORS is managed by Medusa http config (STORE_CORS/AUTH_CORS)
function setCorsHeaders(res: MedusaResponse) {
  // noop in production
}

/**
 * OPTIONS /store/loyalty/rewards
 * Handle preflight requests
 */
export async function OPTIONS(
  req: MedusaRequest,
  res: MedusaResponse
) {
  setCorsHeaders(res);
  return res.status(200).end();
}

/**
 * GET /store/loyalty/rewards
 * Pobierz dostępne nagrody lojalnościowe
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Set CORS headers
    setCorsHeaders(res);
    
    // Get from database
    const loyaltyService = req.scope.resolve("loyaltyService")
    const rewards = await loyaltyService.getActiveRewards()

    console.log('✅ Loyalty rewards fetched successfully')

    return res.status(200).json({ rewards })
    
  } catch (error) {
    console.error('❌ Error fetching loyalty rewards:', error)
    
    return res.status(500).json({
      type: "internal_server_error",
      message: "Failed to fetch loyalty rewards"
    })
  }
}
