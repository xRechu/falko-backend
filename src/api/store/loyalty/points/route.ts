import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// CORS Middleware
function setCorsHeaders(res: MedusaResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-publishable-api-key, customer-id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * OPTIONS /store/loyalty/points
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
 * GET /store/loyalty/points
 * Pobierz punkty lojalnościowe dla zalogowanego klienta
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Set CORS headers
    setCorsHeaders(res);
    
    // Get customer ID from query/headers (simplified for now)
    const customerId = req.headers['customer-id'] as string

    if (!customerId) {
      return res.status(401).json({
        type: "unauthorized",
        message: "Customer ID required in headers"
      })
    }
    
    // Mock data for now - later we'll query the database
    const loyaltyData = {
      points: 1250,
      history: [
        {
          id: '1',
          type: 'earned',
          points: 200,
          description: 'Bonus powitalny za rejestrację',
          created_at: '2025-07-15T10:00:00Z'
        },
        {
          id: '2', 
          type: 'earned',
          points: 150,
          description: 'Punkty za zakup zamówienia #FL-001',
          order_id: 'order_01J3K2M9N0P1Q2R3S4T5U6',
          created_at: '2025-07-18T14:30:00Z'
        },
        {
          id: '3',
          type: 'spent',
          points: 100,
          description: 'Wykorzystano punkty na: 10% zniżki na wszystko',
          reward_id: 'discount-10',
          created_at: '2025-07-19T16:45:00Z'
        }
      ]
    }

    console.log(`✅ Loyalty points fetched for customer: ${customerId}`)

    return res.status(200).json(loyaltyData)
    
  } catch (error) {
    console.error('❌ Error fetching loyalty points:', error)
    
    return res.status(500).json({
      type: "internal_server_error",
      message: "Failed to fetch loyalty points"
    })
  }
}
