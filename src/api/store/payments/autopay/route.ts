type MedusaRequest = any
type MedusaResponse = any

// Legacy endpoint removed
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return res.status(410).json({ success: false, error: 'Payment provider removed' })
}

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  return res.status(204).end()
}