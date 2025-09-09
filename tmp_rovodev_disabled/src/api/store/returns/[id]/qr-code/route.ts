import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

/**
 * GET /store/returns/{id}/qr-code
 * Get QR code for return shipping
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Resolve authenticated customer from session
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

    const returnId = req.params.id
    if (!returnId) {
      return res.status(400).json({
        success: false,
        error: 'Return ID is required'
      })
    }

    const returnsService = req.scope.resolve("returnsService")
    
    try {
      const returnData = await returnsService.getReturn(returnId)
      
      // Verify return belongs to customer
      if (returnData.customer_id !== customerId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this return'
        })
      }
      
      // Check if QR code exists
      if (!returnData.furgonetka_qr_code) {
        return res.status(404).json({
          success: false,
          error: 'QR code not yet generated for this return'
        })
      }
      
      return res.status(200).json({
        success: true,
        qr_code_url: returnData.furgonetka_qr_code,
        tracking_number: returnData.furgonetka_tracking_number,
        status: returnData.status,
        return_id: returnData.id,
        instructions: {
          step1: "Zapakuj produkty w oryginalne opakowanie",
          step2: "Wydrukuj i przyklej QR kod do paczki", 
          step3: "Zadzwoń po kuriera lub zostaw w punkcie odbioru",
          step4: "Śledź status zwrotu w swoim koncie"
        }
      })
      
    } catch (returnError) {
      return res.status(404).json({
        success: false,
        error: 'Return not found'
      })
    }

  } catch (error) {
    console.error('❌ Error fetching return QR code:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch QR code'
    })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  return res.status(200).end()
}