import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

/**
 * GET /admin/returns
 * Get all returns for admin panel
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const returnsService = req.scope.resolve("returnsService")
    
    // Get query parameters for filtering/pagination
    const { 
      status, 
      limit = 50, 
      offset = 0,
      order_id,
      customer_id 
    } = req.query
    
    // For now, get all returns (TODO: add proper filtering and pagination)
    const manager = returnsService.activeManager_
    
    let query = `
      SELECT 
        r.*,
        s.reason_code as survey_reason_code,
        s.satisfaction_rating,
        s.size_issue,
        s.quality_issue,
        s.description as survey_description
      FROM returns r
      LEFT JOIN return_surveys s ON r.id = s.return_id
      WHERE 1=1
    `
    
    const params = []
    let paramIndex = 1
    
    if (status) {
      query += ` AND r.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }
    
    if (order_id) {
      query += ` AND r.order_id = $${paramIndex}`
      params.push(order_id)
      paramIndex++
    }
    
    if (customer_id) {
      query += ` AND r.customer_id = $${paramIndex}`
      params.push(customer_id)
      paramIndex++
    }
    
    query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(parseInt(limit), parseInt(offset))
    
    const result = await manager.query(query, params)
    
    const returns = result.map(row => ({
      id: row.id,
      order_id: row.order_id,
      customer_id: row.customer_id,
      status: row.status,
      refund_method: row.refund_method,
      items: JSON.parse(row.items),
      total_amount: row.total_amount,
      refund_amount: row.refund_amount,
      furgonetka_qr_code: row.furgonetka_qr_code,
      furgonetka_tracking_number: row.furgonetka_tracking_number,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
      processed_at: row.processed_at,
      survey: {
        reason_code: row.survey_reason_code,
        satisfaction_rating: row.satisfaction_rating,
        size_issue: row.size_issue,
        quality_issue: row.quality_issue,
        description: row.survey_description
      }
    }))
    
    return res.status(200).json({
      success: true,
      returns,
      count: returns.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

  } catch (error) {
    console.error('❌ Error fetching admin returns:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch returns'
    })
  }
}