import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

/**
 * GET /store/loyalty/history
 * Historia transakcji punktowych zalogowanego klienta
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pk = (req.headers['x-publishable-api-key'] as string) || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''
    const cookie = req.headers['cookie'] as string | undefined
    if (!cookie) {
      return res.status(401).json({ type: 'unauthorized', message: 'Customer authentication required' })
    }
    const base = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
    const r = await fetch(`${base}/store/customers/me`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-publishable-api-key': pk,
        'cookie': cookie,
      } as any,
    })
    if (!r.ok) {
      return res.status(401).json({ type: 'unauthorized', message: 'Customer authentication required' })
    }
    const me = await r.json()
    const customerId = me?.customer?.id
    if (!customerId) {
      return res.status(401).json({ type: 'unauthorized', message: 'Customer authentication required' })
    }

    const limit = parseInt((req.query?.limit as string) || '50')
    const loyaltyService = req.scope.resolve("loyaltyService")
    const transactions = await loyaltyService.getCustomerTransactions(customerId, limit)

    const formatted = transactions.map((t: any) => ({
      id: t.id,
      type: t.type,
      points: t.points,
      description: t.description,
      order_id: t.order_id,
      reward_id: t.reward_id,
      created_at: t.created_at,
      metadata: t.metadata,
    }))

    return res.status(200).json({
      customer_id: customerId,
      transactions: formatted,
      total_count: formatted.length
    })
  } catch (error) {
    console.error('❌ Error fetching loyalty history:', error)
    return res.status(500).json({
      type: 'internal_server_error',
      message: 'Failed to fetch loyalty history'
    })
  }
}
