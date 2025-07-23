import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
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

    // Get loyalty service
    const loyaltyService = req.scope.resolve("loyaltyService");
    
    // Get customer loyalty account
    const loyaltyAccount = await loyaltyService.getCustomerAccount(customerId);
    
    if (!loyaltyAccount) {
      // Create new account if doesn't exist
      console.log(`Creating new loyalty account for customer: ${customerId}`);
      const newAccountData = {
        points: 0,
        lifetime_earned: 0,
        lifetime_spent: 0,
        tier: 'Bronze',
        next_tier_points: 500
      };
      
      return res.json({
        customer_id: customerId,
        ...newAccountData
      });
    }

    // Calculate tier and next tier points
    const tier = calculateTier(loyaltyAccount.lifetime_earned);
    const nextTierPoints = calculateNextTierPoints(loyaltyAccount.lifetime_earned);

    console.log(`✅ Loyalty points fetched for customer: ${customerId} - ${loyaltyAccount.total_points} points`);
    
    res.json({
      customer_id: customerId,
      points: loyaltyAccount.total_points,
      lifetime_earned: loyaltyAccount.lifetime_earned,
      lifetime_spent: loyaltyAccount.lifetime_spent,
      tier: tier,
      next_tier_points: nextTierPoints
    });

  } catch (error) {
    console.error('❌ Error fetching loyalty points:', error);
    res.status(500).json({
      type: "internal_server_error",
      message: "Failed to fetch loyalty points"
    });
  }
}

// Helper functions for tier calculation
function calculateTier(lifetimeEarned: number): string {
  if (lifetimeEarned >= 2000) return 'Gold';
  if (lifetimeEarned >= 1000) return 'Silver';
  return 'Bronze';
}

function calculateNextTierPoints(lifetimeEarned: number): number {
  if (lifetimeEarned >= 2000) return 0; // Max tier
  if (lifetimeEarned >= 1000) return 2000 - lifetimeEarned; // Points to Gold
  return 1000 - lifetimeEarned; // Points to Silver
}