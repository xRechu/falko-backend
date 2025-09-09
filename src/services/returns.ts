import { MedusaError } from "@medusajs/utils"

export interface ReturnItem {
  variant_id: string
  quantity: number
  unit_price: number
  title: string
}

export interface CreateReturnRequest {
  order_id: string
  customer_id: string
  items: ReturnItem[]
  reason_code: string
  satisfaction_rating?: number
  size_issue?: string
  quality_issue?: string
  description?: string
  refund_method: 'card' | 'loyalty_points'
}

export interface ReturnSurvey {
  id: string
  return_id: string
  reason_code: string
  satisfaction_rating?: number
  size_issue?: string
  quality_issue?: string
  description?: string
  created_at: Date
}

export interface Return {
  id: string
  order_id: string
  customer_id: string
  status: 'pending_survey' | 'survey_completed' | 'qr_generated' | 'shipped_by_customer' | 'received' | 'processed' | 'refunded' | 'rejected'
  reason_code?: string
  refund_method: 'card' | 'loyalty_points'
  items: ReturnItem[]
  total_amount: number
  refund_amount?: number
  furgonetka_qr_code?: string
  furgonetka_tracking_number?: string
  created_at: Date
  updated_at: Date
  expires_at: Date
  processed_at?: Date
  survey?: ReturnSurvey
}

class ReturnsService {
  private container: any

  constructor(container: any, options: any) {
    this.container = container
  }

  private get manager() {
    try {
      return this.container.resolve("manager")
    } catch {
      return undefined
    }
  }

  /** Check if order is eligible for return (within 14 days and completed) */
  async isOrderEligibleForReturn(orderId: string): Promise<boolean> {
    const orderService = this.container.resolve("orderService")
    try {
      const order = await orderService.retrieve(orderId)
      if (order.status !== 'completed') return false
      const days = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24))
      return days <= 14
    } catch (e) {
      console.error('Error checking order eligibility:', e)
      return false
    }
  }

  /** Create a new return request */
  async createReturn(data: CreateReturnRequest): Promise<Return> {
    const manager = this.manager
    if (!manager) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, 'Database manager not available')

    const eligible = await this.isOrderEligibleForReturn(data.order_id)
    if (!eligible) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Order is not eligible for return (must be completed and within 14 days)')
    }

    const totalAmount = data.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const refundAmount = data.refund_method === 'loyalty_points' ? Math.floor(totalAmount * 1.1) : totalAmount
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    const id = `ret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await manager.query(
      `INSERT INTO returns (id, order_id, customer_id, status, reason_code, refund_method, items, total_amount, refund_amount, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, data.order_id, data.customer_id, 'qr_generated', data.reason_code, data.refund_method, JSON.stringify(data.items), totalAmount, refundAmount, expiresAt]
    )

    await manager.query(
      `INSERT INTO return_surveys (id, return_id, reason_code, satisfaction_rating, size_issue, quality_issue, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`rsv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, id, data.reason_code, data.satisfaction_rating ?? null, data.size_issue ?? null, data.quality_issue ?? null, data.description ?? null]
    )

    await this.generateFurgonetkaQR(id)
    return this.getReturn(id)
  }

  /** Generate Furgonetka QR code for return */
  async generateFurgonetkaQR(returnId: string): Promise<void> {
    const manager = this.manager
    if (!manager) return
    try {
      // TODO: Integrate with real Furgonetka API
      const qrCode = `https://api.furgonetka.pl/qr/return_${returnId}_${Date.now()}`
      const trackingNumber = `RET${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      console.log(`✅ Generated Furgonetka QR for return ${returnId}: ${qrCode}`)
      console.log(`📦 Tracking number: ${trackingNumber}`)
      await manager.query(
        `UPDATE returns SET furgonetka_qr_code = $1, furgonetka_tracking_number = $2, updated_at = NOW() WHERE id = $3`,
        [qrCode, trackingNumber, returnId]
      )
    } catch (error) {
      console.error(`❌ Error generating Furgonetka QR for return ${returnId}:`, error)
      throw error
    }
  }

  /** Get single return */
  async getReturn(returnId: string): Promise<Return> {
    const manager = this.manager
    if (!manager) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, 'Database manager not available')

    const rows = await manager.query(
      `SELECT r.*, s.id as survey_id, s.reason_code as survey_reason_code, s.satisfaction_rating, s.size_issue, s.quality_issue, s.description as survey_description, s.created_at as survey_created_at
       FROM returns r
       LEFT JOIN return_surveys s ON s.return_id = r.id
       WHERE r.id = $1
       LIMIT 1`,
      [returnId]
    )

    if (!rows || rows.length === 0) throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Return not found')
    const row = rows[0]

    const ret: Return = {
      id: row.id,
      order_id: row.order_id,
      customer_id: row.customer_id,
      status: row.status,
      reason_code: row.reason_code,
      refund_method: row.refund_method,
      items: Array.isArray(row.items) ? row.items : JSON.parse(row.items || '[]'),
      total_amount: row.total_amount,
      refund_amount: row.refund_amount ?? undefined,
      furgonetka_qr_code: row.furgonetka_qr_code ?? undefined,
      furgonetka_tracking_number: row.furgonetka_tracking_number ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
      processed_at: row.processed_at ?? undefined,
      survey: row.survey_id
        ? {
            id: row.survey_id,
            return_id: row.id,
            reason_code: row.survey_reason_code,
            satisfaction_rating: row.satisfaction_rating ?? undefined,
            size_issue: row.size_issue ?? undefined,
            quality_issue: row.quality_issue ?? undefined,
            description: row.survey_description ?? undefined,
            created_at: row.survey_created_at,
          }
        : undefined,
    }
    return ret
  }

  /** Get returns for customer */
  async getCustomerReturns(customerId: string): Promise<Return[]> {
    const manager = this.manager
    if (!manager) return []

    const rows = await manager.query(
      `SELECT r.*, s.id as survey_id, s.reason_code as survey_reason_code, s.satisfaction_rating, s.size_issue, s.quality_issue, s.description as survey_description, s.created_at as survey_created_at
       FROM returns r
       LEFT JOIN return_surveys s ON s.return_id = r.id
       WHERE r.customer_id = $1
       ORDER BY r.created_at DESC`,
      [customerId]
    )

    return (rows || []).map((row: any) => ({
      id: row.id,
      order_id: row.order_id,
      customer_id: row.customer_id,
      status: row.status,
      reason_code: row.reason_code,
      refund_method: row.refund_method,
      items: Array.isArray(row.items) ? row.items : JSON.parse(row.items || '[]'),
      total_amount: row.total_amount,
      refund_amount: row.refund_amount ?? undefined,
      furgonetka_qr_code: row.furgonetka_qr_code ?? undefined,
      furgonetka_tracking_number: row.furgonetka_tracking_number ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
      processed_at: row.processed_at ?? undefined,
      survey: row.survey_id
        ? {
            id: row.survey_id,
            return_id: row.id,
            reason_code: row.survey_reason_code,
            satisfaction_rating: row.satisfaction_rating ?? undefined,
            size_issue: row.size_issue ?? undefined,
            quality_issue: row.quality_issue ?? undefined,
            description: row.survey_description ?? undefined,
            created_at: row.survey_created_at,
          }
        : undefined,
    }))
  }

  /** Update return status */
  async updateReturnStatus(returnId: string, status: Return['status']): Promise<Return> {
    const manager = this.manager
    if (!manager) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, 'Database manager not available')

    await manager.query(`UPDATE returns SET status = $1, updated_at = NOW() WHERE id = $2`, [status, returnId])
    return this.getReturn(returnId)
  }

  /** Process refund */
  async processRefund(returnId: string): Promise<void> {
    const manager = this.manager
    if (!manager) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, 'Database manager not available')

    const returnData = await this.getReturn(returnId)

    if (returnData.refund_method === 'loyalty_points') {
      const loyaltyService = this.container.resolve("loyaltyService")
      const refundAmountCents = returnData.refund_amount ?? returnData.total_amount
      const points = Math.floor(refundAmountCents / 100)
      await loyaltyService.awardPoints({
        customerId: returnData.customer_id,
        points,
        orderId: returnData.order_id,
        description: `Zwrot zamówienia ${returnData.order_id} (+10% bonus)`,
        metadata: { return_id: returnData.id, source: 'returns' }
      })
    } else {
      const refundAmountCents = returnData.refund_amount ?? returnData.total_amount
      console.log(`TODO: Process card refund of ${refundAmountCents / 100} PLN for return ${returnId}`)
    }

    await manager.query(`UPDATE returns SET status = 'refunded', processed_at = NOW(), updated_at = NOW() WHERE id = $1`, [returnId])

    const emailService = this.container.resolve("emailService")
    await emailService.sendReturnProcessedEmail({ ...returnData, status: 'refunded', processed_at: new Date() })
  }
}

export default ReturnsService
