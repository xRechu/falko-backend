import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

/**
 * GET /store/orders/{id}/returns/eligible
 * Check if order is eligible for return
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Try to resolve authenticated customer from session
    const customerId = await (async () => {
      try {
        const cookie = req.headers['cookie'] as string | undefined
        const base = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
        const pk = (req.headers['x-publishable-api-key'] as string) || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''
        if (!cookie) return null
        const r = await fetch(`${base}/store/customers/me`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-publishable-api-key': pk,
            'cookie': cookie as string,
          } as any,
        })
        if (!r.ok) return null
        const data = await r.json()
        return data?.customer?.id || null
      } catch {
        return null
      }
    })()

    if (!customerId) {
      return res.status(401).json({
        success: false,
        error: 'Customer authentication required'
      })
    }

    const orderId = req.params.id
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      })
    }

    const returnsService = req.scope.resolve("returnsService")
    const orderService = req.scope.resolve("orderService")
    
    // Check if order exists and belongs to customer
    try {
      const order = await orderService.retrieve(orderId, {
        relations: ["items", "items.variant", "customer"]
      })
      
      if (order.customer_id !== customerId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this order'
        })
      }
      
      // Check eligibility
      const isEligible = await returnsService.isOrderEligibleForReturn(orderId)
      
      // Calculate days remaining
      const orderDate = new Date(order.created_at)
      const now = new Date()
      const daysPassed = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysRemaining = Math.max(0, 14 - daysPassed)
      
      // Check if return already exists
      const existingReturns = await returnsService.getCustomerReturns(customerId)
      const hasExistingReturn = existingReturns.some(ret => ret.order_id === orderId)
      
      return res.status(200).json({
        success: true,
        eligible: isEligible && !hasExistingReturn,
        order_status: order.status,
        days_passed: daysPassed,
        days_remaining: daysRemaining,
        has_existing_return: hasExistingReturn,
        order_date: order.created_at,
        items: order.items.map(item => ({
          id: item.id,
          variant_id: item.variant_id,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          thumbnail: item.thumbnail
        }))
      })
      
    } catch (orderError) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      })
    }

  } catch (error) {
    console.error('❌ Error checking return eligibility:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to check return eligibility'
    })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  return res.status(200).end()
}