import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

/**
 * Get customer loyalty transaction history
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Get authenticated customer from Medusa context
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

    // Get query parameters
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Get loyalty service
    const loyaltyService = req.scope.resolve("loyaltyService");
    
    // Get customer transaction history
    const transactions = await loyaltyService.getCustomerTransactions(customerId, limit);
    
    // Format transactions for frontend
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      points: transaction.points,
      description: transaction.description,
      order_id: transaction.order_id,
      reward_id: transaction.reward_id,
      created_at: transaction.created_at,
      metadata: transaction.metadata
    }));

    console.log(`✅ Loyalty history fetched for customer: ${customerId} - ${transactions.length} transactions`);
    
    res.json({
      customer_id: customerId,
      transactions: formattedTransactions,
      total_count: transactions.length
    });

  } catch (error) {
    console.error('❌ Error fetching loyalty history:', error);
    res.status(500).json({
      type: "internal_server_error",
      message: "Failed to fetch loyalty history"
    });
  }
}