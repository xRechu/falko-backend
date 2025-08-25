import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { emailService } from "../services/email"

/**
 * Subscriber that awards loyalty points when an order payment is captured
 */
export default async function loyaltyOrderCompletionHandler({
  data,
  eventName,
  container,
}: SubscriberArgs<{ id: string }>) {
  
  console.log(`🎯 Loyalty: Processing order completion for order ${data.id}`)
  
  try {
    const orderService = container.resolve("orderService")
    const loyaltyService = container.resolve("loyaltyService")
    
    // Get order details with customer and items
    const order = await orderService.retrieve(data.id, {
      relations: ["customer", "items", "payments", "shipping_address"]
    })
    
    // Skip if no customer (guest checkout)
    if (!order.customer_id) {
      console.log(`⚠️ Loyalty: Order ${data.id} has no customer, skipping points`)
      return
    }
    
    // Skip if order total is 0 or negative
    if (order.total <= 0) {
      console.log(`⚠️ Loyalty: Order ${data.id} has no value, skipping points`)
      return
    }
    
    console.log(`📊 Loyalty: Order details - Customer: ${order.customer_id}, Total: ${order.total / 100} PLN`)
    
    // Calculate points earned for this order
    const pointsEarned = await loyaltyService.calculatePointsForOrder(order)
    
    if (pointsEarned > 0) {
      // Award points to customer
      await loyaltyService.awardPoints({
        customerId: order.customer_id,
        points: pointsEarned,
        orderId: order.id,
        description: `Punkty za zamówienie ${order.display_id}`,
        metadata: {
          order_total: order.total,
          order_display_id: order.display_id,
          items_count: order.items?.length || 0
        }
      })
      
      console.log(`✅ Loyalty: Successfully awarded ${pointsEarned} points to customer ${order.customer_id} for order ${order.display_id}`)
      
      // Send email notification about earned points
      if (order.customer?.email) {
        try {
          const pointsData = {
            customerName: `${order.customer.first_name} ${order.customer.last_name}`.trim() || order.customer.email,
            pointsEarned: pointsEarned,
            orderNumber: order.display_id,
            totalPoints: await loyaltyService.getCustomerBalance(order.customer_id),
            loyaltyUrl: `${process.env.STORE_CORS?.split(',')[0] || 'http://localhost:3000'}/konto`
          }
          
          // Create simple points earned email template
          const html = `
            <h2>🎉 Zdobyłeś punkty lojalnościowe!</h2>
            <p>Cześć ${pointsData.customerName}!</p>
            <p>Za zamówienie <strong>#${pointsData.orderNumber}</strong> otrzymałeś <strong>${pointsData.pointsEarned} punktów</strong>!</p>
            <p>Twój aktualny stan punktów: <strong>${pointsData.totalPoints} punktów</strong></p>
            <p><a href="${pointsData.loyaltyUrl}">Zobacz swoje punkty w koncie</a></p>
            <p>Dziękujemy za zakupy w Falko Project! 🛍️</p>
          `
          
          await emailService.sendEmail({
            to: order.customer.email,
            subject: `🎉 Zdobyłeś ${pointsEarned} punktów za zamówienie #${order.display_id}`,
            html,
            text: `Zdobyłeś ${pointsEarned} punktów za zamówienie #${order.display_id}. Aktualny stan: ${pointsData.totalPoints} punktów.`
          })
          
          console.log(`📧 Email: Points notification sent to ${order.customer.email}`)
        } catch (emailError) {
          console.error(`❌ Email: Failed to send points notification:`, emailError)
        }
      }
      
    } else {
      console.log(`ℹ️ Loyalty: No points awarded for order ${order.display_id} (below minimum or other criteria)`)
    }
    
  } catch (error) {
    console.error(`❌ Loyalty: Error processing order completion for ${data.id}:`, error)
    // Don't throw error to avoid breaking order completion flow
  }
}

export const config: SubscriberConfig = {
  event: "order.payment_captured",
  context: {
    subscriberId: "loyalty-order-completion",
  },
}