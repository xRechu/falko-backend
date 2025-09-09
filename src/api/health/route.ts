import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Simple health endpoint used by Fly.io checks
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() })
}
