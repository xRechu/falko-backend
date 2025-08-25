// Using any to avoid coupling to removed types
type MedusaRequest = any
type MedusaResponse = any

// Payment endpoints removed – respond with 410 Gone to any legacy calls
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return res.status(410).json({ success: false, error: 'Payment provider removed' })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  return res.status(410).send('Payment provider removed')
}