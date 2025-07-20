import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

interface RedeemRewardBody {
  reward_id: string
}

// CORS Middleware
function setCorsHeaders(res: MedusaResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-publishable-api-key, customer-id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * OPTIONS /store/loyalty/redeem
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
 * POST /store/loyalty/redeem
 * Wykorzystaj punkty na nagrodę
 */
export async function POST(
  req: MedusaRequest<RedeemRewardBody>,
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

    const { reward_id } = req.body

    if (!reward_id) {
      return res.status(400).json({
        type: "invalid_data",
        message: "reward_id is required"
      })
    }

    // Mock rewards lookup - later we'll query the database
    const rewards = [
      { id: '1', title: '50 PLN Zniżka', points_cost: 500 },
      { id: '2', title: 'Darmowa dostawa', points_cost: 300 },
      { id: '3', title: 'Exclusive T-shirt', points_cost: 1500 },
      { id: '4', title: '15% Zniżka Premium', points_cost: 1000 },
      { id: '5', title: 'Early Access', points_cost: 3000 },
      { id: '6', title: '20% Zniżka', points_cost: 2000 }
    ]

    const reward = rewards.find(r => r.id === reward_id)

    if (!reward) {
      return res.status(404).json({
        type: "not_found",
        message: "Reward not found"
      })
    }

    // Mock points check - later we'll query customer's actual points
    const customerPoints = 1250

    if (customerPoints < reward.points_cost) {
      return res.status(400).json({
        type: "insufficient_points",
        message: `Insufficient points. Required: ${reward.points_cost}, Available: ${customerPoints}`
      })
    }

    // Create transaction record
    const transaction = {
      id: Date.now().toString(),
      type: 'spent',
      points: reward.points_cost,
      description: `Wykorzystano punkty na: ${reward.title}`,
      reward_id: reward_id,
      created_at: new Date().toISOString()
    }

    const response = {
      success: true,
      message: 'Nagroda została pomyślnie odebrana',
      transaction,
      new_points_balance: customerPoints - reward.points_cost
    }

    console.log(`✅ Reward redeemed for customer ${customerId}: ${reward.title}`)

    return res.status(200).json(response)
    
  } catch (error) {
    console.error('❌ Error redeeming reward:', error)
    
    return res.status(500).json({
      type: "internal_server_error",
      message: "Failed to redeem reward"
    })
  }
}
