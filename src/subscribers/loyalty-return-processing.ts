import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

/**
 * Subscriber that handles loyalty points when returns are processed
 */
export default async function loyaltyReturnProcessingHandler({
  data,
  eventName,
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
  
  console.log(`🎯 Loyalty: Processing return for return ${data.id}, order ${data.order_id}`)
  
  try {
    const orderService = container.resolve("orderService")
    const returnService = container.resolve("returnService")
    const loyaltyService = container.resolve("loyaltyService")
    
    // Get return details
    const returnOrder = await returnService.retrieve(data.id, {
      relations: ["items", "order", "order.customer"]
    })
    
    // Get original order
    const order = returnOrder.order
    
    // Skip if no customer
    if (!order.customer_id) {
      console.log(`⚠️ Loyalty: Return ${data.id} order has no customer, skipping point adjustment`)
      return
    }
    
    // Calculate points to deduct based on returned items
    const returnValue = returnOrder.items.reduce((total: number, item: any) => {
      return total + (item.unit_price * item.quantity)
    }, 0)
    
    // Calculate proportional points to deduct
    const originalOrderValue = order.total
    const pointsToDeduct = Math.floor((returnValue / originalOrderValue) * (returnValue / 100)) // Approximate calculation
    
    if (pointsToDeduct > 0) {
      console.log(`📊 Loyalty: Return value: ${returnValue / 100} PLN, deducting ~${pointsToDeduct} points`)
      
      // Create a refund transaction for the returned items
      await loyaltyService.reverseOrderPoints({
        customerId: order.customer_id,
        orderId: order.id,
        description: `Zwrot punktów za zwrócone produkty (zwrot ${data.id})`
      })
      
      console.log(`✅ Loyalty: Successfully processed point deduction for return ${data.id}`)
      
      // TODO: Send notification email to customer about point adjustment
      // await notificationService.sendPointsReturnEmail(order.customer, pointsToDeduct)
      
    } else {
      console.log(`ℹ️ Loyalty: No points to deduct for return ${data.id}`)
    }
    
  } catch (error) {
    console.error(`❌ Loyalty: Error processing return for ${data.id}:`, error)
    // Don't throw error to avoid breaking return processing flow
  }
}

export const config: SubscriberConfig = {
  event: "return.received",
  context: {
    subscriberId: "loyalty-return-processing",
  },
}