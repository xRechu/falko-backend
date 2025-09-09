import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/utils"

// Helper to resolve authenticated customer's ID from the session cookie
async function getAuthenticatedCustomerId(req: MedusaRequest): Promise<string | null> {
  try {
    const cookie = req.headers["cookie"] as string | undefined
    if (!cookie) return null
    const base = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
    const pk = (req.headers["x-publishable-api-key"] as string) || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

    const r = await fetch(`${base}/store/customers/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-publishable-api-key": pk,
        cookie,
      } as any,
    })

    if (!r.ok) return null
    const data = await r.json()
    return data?.customer?.id || null
  } catch {
    return null
  }
}

/**
 * GET /store/returns
 * Get customer's returns
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Validate publishable key
    const publishableKey = (req.headers["x-publishable-api-key"] as string) ||
      (req.headers["authorization"] as string | undefined)?.replace("Bearer ", "")
    if (!publishableKey || !process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || publishableKey !== process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
      return res.status(401).json({
        success: false,
        error: "Invalid or missing publishable API key",
      })
    }

    // Resolve authenticated customer from session
    const customerId = await getAuthenticatedCustomerId(req)
    if (!customerId) {
      return res.status(401).json({ success: false, error: "Customer authentication required" })
    }

    const returnsService = req.scope.resolve("returnsService")
    const returns = await returnsService.getCustomerReturns(customerId)

    return res.status(200).json({
      success: true,
      returns,
    })
  } catch (error: any) {
    console.error("❌ Error fetching customer returns:", error)
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to fetch returns",
    })
  }
}

/**
 * POST /store/returns
 * Create new return request
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Validate publishable key
    const publishableKey = (req.headers["x-publishable-api-key"] as string) ||
      (req.headers["authorization"] as string | undefined)?.replace("Bearer ", "")
    if (!publishableKey || !process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || publishableKey !== process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
      return res.status(401).json({
        success: false,
        error: "Invalid or missing publishable API key",
      })
    }

    // Resolve authenticated customer from session
    const customerId = await getAuthenticatedCustomerId(req)
    if (!customerId) {
      return res.status(401).json({
        success: false,
        error: "Customer authentication required",
      })
    }

    const {
      order_id,
      items,
      reason_code,
      satisfaction_rating,
      size_issue,
      quality_issue,
      description,
      refund_method
    } = req.body

    // Validate required fields
    if (!order_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Order ID and items are required",
      })
    }

    if (!reason_code) {
      return res.status(400).json({
        success: false,
        error: "Reason code is required",
      })
    }

    if (!refund_method || !["card", "loyalty_points"].includes(refund_method)) {
      return res.status(400).json({
        success: false,
        error: "Valid refund method is required (card or loyalty_points)",
      })
    }

    // Validate items structure
    for (const item of items) {
      if (!item.variant_id || !item.quantity || !item.unit_price || !item.title) {
        return res.status(400).json({
          success: false,
          error: "Each item must have variant_id, quantity, unit_price, and title",
        })
      }
    }

    const returnsService = req.scope.resolve("returnsService")
    
    const returnData = await returnsService.createReturn({
      order_id,
      customer_id: customerId,
      items,
      reason_code,
      satisfaction_rating,
      size_issue,
      quality_issue,
      description,
      refund_method
    })

    // Send confirmation email
    try {
      const emailService = req.scope.resolve("emailService")
      await emailService.sendReturnConfirmationEmail(returnData)
    } catch (emailError) {
      console.error('⚠️ Failed to send return confirmation email:', emailError)
      // Don't fail the request if email fails
    }

    return res.status(201).json({
      success: true,
      return: returnData,
      message: 'Return request created successfully'
    })

  } catch (error) {
    console.error('❌ Error creating return:', error)
    
    if (error instanceof MedusaError) {
      return res.status(400).json({
        success: false,
        error: error.message
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create return request'
    })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  return res.status(200).end()
}