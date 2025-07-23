import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

/**
 * Subscriber that reverses loyalty points when an order is cancelled
 */
export default async function loyaltyOrderCancellationHandler({
  data,
  eventName,
  container,
}: SubscriberArgs<{ id: string }>) {
  
  console.log(`🎯 Loyalty: Processing order cancellation for order ${data.id}`)
  
  try {
    const orderService = container.resolve("orderService")
    const loyaltyService = container.resolve("loyaltyService")
    
    // Get order details
    const order = await orderService.retrieve(data.id, {
      relations: ["customer"]
    })
    
    // Skip if no customer
    if (!order.customer_id) {
      console.log(`⚠️ Loyalty: Cancelled order ${data.id} has no customer, skipping point reversal`)
      return
    }
    
    console.log(`📊 Loyalty: Reversing points for cancelled order - Customer: ${order.customer_id}, Order: ${order.display_id}`)
    
    // Reverse points from this order
    await loyaltyService.reverseOrderPoints({
      customerId: order.customer_id,
      orderId: order.id,
      description: `Zwrot punktów za anulowane zamówienie ${order.display_id}`
    })
    
    console.log(`✅ Loyalty: Successfully reversed points for customer ${order.customer_id} from cancelled order ${order.display_id}`)
    
    // TODO: Send notification email to customer about point reversal
    // await notificationService.sendPointsReversedEmail(order.customer, order.display_id)
    
  } catch (error) {
    console.error(`❌ Loyalty: Error processing order cancellation for ${data.id}:`, error)
    // Don't throw error to avoid breaking order cancellation flow
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
  context: {
    subscriberId: "loyalty-order-cancellation",
  },
}