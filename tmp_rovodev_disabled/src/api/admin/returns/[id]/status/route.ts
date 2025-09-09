import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

/**
 * PUT /admin/returns/{id}/status
 * Update return status
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const returnId = req.params.id
    const { status } = req.body
    
    if (!returnId) {
      return res.status(400).json({
        success: false,
        error: 'Return ID is required'
      })
    }
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      })
    }
    
    // Validate status
    const validStatuses = [
      'pending_survey', 'survey_completed', 'qr_generated', 
      'shipped_by_customer', 'received', 'processed', 'refunded', 'rejected'
    ]
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      })
    }
    
    const returnsService = req.scope.resolve("returnsService")
    
    // Update status
    const updatedReturn = await returnsService.updateReturnStatus(returnId, status)
    
    // If status is 'received', trigger refund processing
    if (status === 'received') {
      try {
        await returnsService.processRefund(returnId)
        console.log(`✅ Processed refund for return ${returnId}`)
      } catch (refundError) {
        console.error(`❌ Error processing refund for return ${returnId}:`, refundError)
        // Don't fail the status update if refund processing fails
      }
    }
    
    return res.status(200).json({
      success: true,
      return: updatedReturn,
      message: `Return status updated to ${status}`
    })

  } catch (error) {
    console.error('❌ Error updating return status:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update return status'
    })
  }
}

/**
 * POST /admin/returns/{id}/status
 * Legacy endpoint for backward compatibility
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return PUT(req, res)
}