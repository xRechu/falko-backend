import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Get authenticated customer from Medusa context
    // TODO: Implement proper Medusa customer authentication
    // For now, we'll use a development-safe approach
    const publishableKey = req.headers['x-publishable-api-key'] as string;
    
    if (!publishableKey) {
      return res.status(401).json({
        type: "unauthorized",
        message: "Authentication required"
      })
    }
    
    // Development: Use demo customer ID, Production: Get from authenticated session
    const customerId = process.env.NODE_ENV === 'development' ? 'demo-customer' : null;
    
    if (!customerId) {
      return res.status(401).json({
        type: "unauthorized", 
        message: "Customer authentication required"
      })
    }

    const { reward_id } = req.body;

    if (!reward_id) {
      return res.status(400).json({
        type: "invalid_data",
        message: "Reward ID is required"
      });
    }

    // Get loyalty service
    const loyaltyService = req.scope.resolve("loyaltyService");
    
    // Get reward details (for now, use mock rewards)
    const mockRewards = {
      'discount-50': { title: '50 zł zniżki', points_cost: 500 },
      'discount-100': { title: '100 zł zniżki', points_cost: 1000 },
      'free-shipping': { title: 'Darmowa dostawa', points_cost: 200 },
      'discount-25': { title: '25 zł zniżki', points_cost: 250 },
      'exclusive-access': { title: 'Wczesny dostęp', points_cost: 300 },
      'birthday-bonus': { title: 'Bonus urodzinowy', points_cost: 150 },
    };
    
    const reward = mockRewards[reward_id as keyof typeof mockRewards];
    
    if (!reward) {
      return res.status(404).json({
        type: "not_found",
        message: "Reward not found"
      });
    }

    // Attempt to spend points
    const success = await loyaltyService.spendPoints(
      customerId,
      reward.points_cost,
      reward_id,
      `Wykorzystanie nagrody: ${reward.title}`
    );

    if (!success) {
      return res.status(400).json({
        type: "insufficient_points",
        message: "Insufficient points for this reward"
      });
    }

    // Get updated balance
    const updatedAccount = await loyaltyService.getCustomerAccount(customerId);
    
    const redemption = {
      success: true,
      reward_id: reward_id,
      reward_title: reward.title,
      points_spent: reward.points_cost,
      remaining_points: updatedAccount?.total_points || 0,
      redemption_id: `red_${Date.now()}`
    };

    console.log(`✅ Reward redeemed for customer: ${customerId}, Reward: ${reward.title}, Points spent: ${reward.points_cost}`);
    res.json(redemption);

  } catch (error) {
    console.error('❌ Error redeeming reward:', error);
    res.status(500).json({
      type: "internal_server_error",
      message: "Failed to redeem reward"
    });
  }
}