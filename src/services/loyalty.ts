import { TransactionBaseService } from "@medusajs/medusa"
import { EntityManager } from "typeorm"

// Loyalty configuration
const LOYALTY_CONFIG = {
  // Points per PLN spent (1 PLN = 1 point)
  pointsPerPLN: 1,
  
  // Bonus multipliers
  bonuses: {
    firstOrder: 2.0,        // 2x points for first order
    birthdayMonth: 1.5,     // 1.5x points in birthday month
    premiumMember: 1.2,     // 1.2x points for premium members
  },
  
  // Minimum order for points (in cents)
  minimumOrderValue: 5000,  // 50 PLN minimum
  
  // Maximum points per order
  maxPointsPerOrder: 1000,
  
  // Special categories
  categoryMultipliers: {
    'new-arrivals': 1.5,
    'sale': 0.5,
  }
}

interface LoyaltyAccount {
  id: string
  customer_id: string
  total_points: number
  lifetime_earned: number
  lifetime_spent: number
  created_at: Date
  updated_at: Date
}

interface LoyaltyTransaction {
  id: string
  customer_id: string
  type: 'earned' | 'spent' | 'refunded'
  points: number
  description: string
  order_id?: string
  reward_id?: string
  metadata: any
  created_at: Date
}

interface AwardPointsParams {
  customerId: string
  points: number
  orderId: string
  description: string
  metadata?: any
}

interface ReversePointsParams {
  customerId: string
  orderId: string
  description: string
}

class LoyaltyService extends TransactionBaseService {
  
  /**
   * Calculate points for an order
   */
  async calculatePointsForOrder(order: any): Promise<number> {
    const config = LOYALTY_CONFIG
    
    // Convert cents to PLN for calculation
    const orderValuePLN = order.total / 100
    
    // Check minimum order value
    if (order.total < config.minimumOrderValue) {
      console.log(`Order ${order.id} below minimum value for points`)
      return 0
    }
    
    // Base points calculation
    let points = Math.floor(orderValuePLN * config.pointsPerPLN)
    
    // Apply first order bonus
    if (await this.isFirstOrder(order.customer_id)) {
      points *= config.bonuses.firstOrder
      console.log(`Applied first order bonus: ${points} points`)
    }
    
    // Apply category multipliers (if order has category info)
    if (order.metadata?.category) {
      const multiplier = config.categoryMultipliers[order.metadata.category]
      if (multiplier) {
        points *= multiplier
        console.log(`Applied category multiplier (${order.metadata.category}): ${points} points`)
      }
    }
    
    // Apply maximum cap
    const finalPoints = Math.min(Math.floor(points), config.maxPointsPerOrder)
    
    console.log(`Calculated ${finalPoints} points for order ${order.id} (${orderValuePLN} PLN)`)
    return finalPoints
  }
  
  /**
   * Award points to customer
   */
  async awardPoints({ customerId, points, orderId, description, metadata = {} }: AwardPointsParams): Promise<void> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      try {
        // Create transaction record
        await manager.query(`
          INSERT INTO loyalty_transactions (customer_id, type, points, description, order_id, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [customerId, 'earned', points, description, orderId, JSON.stringify(metadata)])
        
        // Update or create account balance
        await manager.query(`
          INSERT INTO loyalty_accounts (customer_id, total_points, lifetime_earned)
          VALUES ($1, $2, $3)
          ON CONFLICT (customer_id) 
          DO UPDATE SET 
            total_points = loyalty_accounts.total_points + $2,
            lifetime_earned = loyalty_accounts.lifetime_earned + $3,
            updated_at = NOW()
        `, [customerId, points, points])
        
        console.log(`✅ Awarded ${points} points to customer ${customerId} for order ${orderId}`)
        
      } catch (error) {
        console.error(`❌ Error awarding points to customer ${customerId}:`, error)
        throw error
      }
    })
  }
  
  /**
   * Reverse points from cancelled/returned order
   */
  async reverseOrderPoints({ customerId, orderId, description }: ReversePointsParams): Promise<void> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      try {
        // Find original earning transaction
        const result = await manager.query(`
          SELECT points FROM loyalty_transactions 
          WHERE customer_id = $1 AND order_id = $2 AND type = 'earned'
          ORDER BY created_at DESC
          LIMIT 1
        `, [customerId, orderId])
        
        if (result.length === 0) {
          console.log(`No points to reverse for order ${orderId}`)
          return
        }
        
        const pointsToReverse = result[0].points
        
        // Create reversal transaction
        await manager.query(`
          INSERT INTO loyalty_transactions (customer_id, type, points, description, order_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [customerId, 'refunded', pointsToReverse, description, orderId])
        
        // Update account balance (ensure it doesn't go negative)
        await manager.query(`
          UPDATE loyalty_accounts 
          SET 
            total_points = GREATEST(0, total_points - $1),
            updated_at = NOW()
          WHERE customer_id = $2
        `, [pointsToReverse, customerId])
        
        console.log(`✅ Reversed ${pointsToReverse} points for customer ${customerId} from order ${orderId}`)
        
      } catch (error) {
        console.error(`❌ Error reversing points for customer ${customerId}:`, error)
        throw error
      }
    })
  }
  
  /**
   * Spend points for reward redemption
   */
  async spendPoints(customerId: string, points: number, rewardId: string, description: string): Promise<boolean> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      try {
        // Check current balance
        const balanceResult = await manager.query(`
          SELECT total_points FROM loyalty_accounts WHERE customer_id = $1
        `, [customerId])
        
        if (balanceResult.length === 0 || balanceResult[0].total_points < points) {
          console.log(`Insufficient points for customer ${customerId}`)
          return false
        }
        
        // Create spending transaction
        await manager.query(`
          INSERT INTO loyalty_transactions (customer_id, type, points, description, reward_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [customerId, 'spent', points, description, rewardId])
        
        // Update account balance
        await manager.query(`
          UPDATE loyalty_accounts 
          SET 
            total_points = total_points - $1,
            lifetime_spent = lifetime_spent + $1,
            updated_at = NOW()
          WHERE customer_id = $2
        `, [points, customerId])
        
        console.log(`✅ Customer ${customerId} spent ${points} points on reward ${rewardId}`)
        return true
        
      } catch (error) {
        console.error(`❌ Error spending points for customer ${customerId}:`, error)
        throw error
      }
    })
  }
  
  /**
   * Get customer loyalty account
   */
  async getCustomerAccount(customerId: string): Promise<LoyaltyAccount | null> {
    try {
      const result = await this.manager_.query(`
        SELECT * FROM loyalty_accounts WHERE customer_id = $1
      `, [customerId])
      
      return result.length > 0 ? result[0] : null
    } catch (error) {
      console.error(`❌ Error getting loyalty account for customer ${customerId}:`, error)
      return null
    }
  }
  
  /**
   * Get customer transaction history
   */
  async getCustomerTransactions(customerId: string, limit: number = 50): Promise<LoyaltyTransaction[]> {
    try {
      const result = await this.manager_.query(`
        SELECT * FROM loyalty_transactions 
        WHERE customer_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [customerId, limit])
      
      return result
    } catch (error) {
      console.error(`❌ Error getting transactions for customer ${customerId}:`, error)
      return []
    }
  }
  
  /**
   * Check if this is customer's first order
   */
  private async isFirstOrder(customerId: string): Promise<boolean> {
    try {
      const result = await this.manager_.query(`
        SELECT COUNT(*) as count FROM loyalty_transactions 
        WHERE customer_id = $1 AND type = 'earned'
      `, [customerId])
      
      return parseInt(result[0].count) === 0
    } catch (error) {
      console.error(`❌ Error checking first order for customer ${customerId}:`, error)
      return false
    }
  }
  
  /**
   * Get loyalty configuration
   */
  getConfig() {
    return LOYALTY_CONFIG
  }
}

export default LoyaltyService