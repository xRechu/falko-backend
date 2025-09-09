import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { emailService } from "../services/email"

/**
 * Subscriber that sends order confirmation email when payment is captured
 */
export default async function emailOrderConfirmationHandler({
  data,
  eventName,
  container,
}: SubscriberArgs<{ id: string }>) {
  
  console.log(`📧 Email: Processing order confirmation for order ${data.id}`)
  
  try {
    const orderService = container.resolve("orderService")
    
    // Get order details with customer and items
    const order = await orderService.retrieve(data.id, {
      relations: ["customer", "items", "items.variant", "items.variant.product", "shipping_address", "billing_address"]
    })
    
    // Skip if no customer email
    if (!order.customer?.email) {
      console.log(`⚠️ Email: Order ${data.id} has no customer email, skipping confirmation`)
      return
    }
    
    console.log(`📧 Email: Sending order confirmation to ${order.customer.email} for order ${order.display_id}`)
    
    // Prepare order data for email template
    const orderData = {
      customerName: `${order.customer.first_name} ${order.customer.last_name}`.trim() || order.customer.email,
      orderNumber: order.display_id,
      orderTotal: `${(order.total / 100).toFixed(2)} PLN`,
      orderItems: order.items?.map(item => ({
        title: item.variant?.product?.title || item.title || 'Produkt',
        quantity: item.quantity,
        price: `${(item.unit_price / 100).toFixed(2)} PLN`
      })) || [],
      shippingAddress: order.shipping_address ? 
        `${order.shipping_address.first_name} ${order.shipping_address.last_name}\n${order.shipping_address.address_1}\n${order.shipping_address.postal_code} ${order.shipping_address.city}` :
        'Brak adresu dostawy'
    }
    
    // Send order confirmation email
    await emailService.sendOrderConfirmationEmail(order.customer.email, orderData)
    
    console.log(`✅ Email: Order confirmation sent successfully to ${order.customer.email}`)
    
  } catch (error) {
    console.error(`❌ Email: Error sending order confirmation for ${data.id}:`, error)
    // Don't throw error to avoid breaking order completion flow
  }
}

export const config: SubscriberConfig = {
  event: "order.payment_captured",
  context: {
    subscriberId: "email-order-confirmation",
  },
}