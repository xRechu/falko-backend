import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"

/**
 * GET /store/loyalty/points
 * Zwraca stan punktów lojalnościowych zalogowanego klienta
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Ustal klienta po sesji (cookie)
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

    // Serwis lojalnościowy
    const loyaltyService = req.scope.resolve("loyaltyService")

    // Zapewnij, że konto istnieje
    await loyaltyService.ensureAccount(customerId)

    // Pobierz konto
    const account = await loyaltyService.getCustomerAccount(customerId)
    const lifetimeEarned = account?.lifetime_earned || 0
    const points = account?.total_points || 0
    const lifetimeSpent = account?.lifetime_spent || 0

    // Prosta logika rang
    const tier = calculateTier(lifetimeEarned)
    const nextTierPoints = calculateNextTierPoints(lifetimeEarned)

    return res.status(200).json({
      customer_id: customerId,
      points,
      lifetime_earned: lifetimeEarned,
      lifetime_spent: lifetimeSpent,
      tier,
      next_tier_points: nextTierPoints,
    })
  } catch (error) {
    console.error('❌ Error fetching loyalty points:', error)
    return res.status(500).json({
      type: 'internal_server_error',
      message: 'Failed to fetch loyalty points'
    })
  }
}

function calculateTier(lifetimeEarned: number): string {
  if (lifetimeEarned >= 2000) return 'Gold'
  if (lifetimeEarned >= 1000) return 'Silver'
  return 'Bronze'
}

function calculateNextTierPoints(lifetimeEarned: number): number {
  if (lifetimeEarned >= 2000) return 0
  if (lifetimeEarned >= 1000) return 2000 - lifetimeEarned
  return 1000 - lifetimeEarned
}
