import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { emailService } from "../services/email"

/**
 * Subscriber that sends welcome email when customer is created
 */
export default async function emailWelcomeHandler({
  data,
  eventName,
  container,
}: SubscriberArgs<{ id: string }>) {
  
  console.log(`📧 Email: Processing welcome email for customer ${data.id}`)
  
  try {
    const customerService = container.resolve("customerService")
    
    // Get customer details
    const customer = await customerService.retrieve(data.id)
    
    // Skip if no email
    if (!customer.email) {
      console.log(`⚠️ Email: Customer ${data.id} has no email, skipping welcome`)
      return
    }
    
    console.log(`📧 Email: Sending welcome email to ${customer.email}`)
    
    // Prepare welcome data for email template
    const welcomeData = {
      customerName: `${customer.first_name} ${customer.last_name}`.trim() || customer.email,
      customerEmail: customer.email,
      loginUrl: `${process.env.STORE_CORS?.split(',')[0] || 'http://localhost:3000'}/login`
    }
    
    // Send welcome email
    await emailService.sendWelcomeEmail(customer.email, welcomeData)
    
    console.log(`✅ Email: Welcome email sent successfully to ${customer.email}`)
    
  } catch (error) {
    console.error(`❌ Email: Error sending welcome email for customer ${data.id}:`, error)
    // Don't throw error to avoid breaking customer creation flow
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
  context: {
    subscriberId: "email-welcome",
  },
}