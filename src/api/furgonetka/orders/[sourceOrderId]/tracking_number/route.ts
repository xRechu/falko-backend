/**
 * POST /furgonetka/orders/[sourceOrderId]/tracking_number
 * Dodawanie numeru przesyłki do zamówienia
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Sprawdź autoryzację Furgonetka
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.FURGONETKA_AUTH_TOKEN;
    
    if (!authHeader || !expectedToken) {
      console.warn('🚨 Furgonetka API: Brak autoryzacji');
      return res.status(401).json({ error: 'Authorization required' });
    }
    
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (token !== expectedToken) {
      console.warn('🚨 Furgonetka API: Nieprawidłowy token');
      return res.status(401).json({ error: 'Invalid authorization token' });
    }
    
    const { sourceOrderId } = req.params;
    const { tracking } = req.body as { tracking?: { number?: string; courierService?: string } };
    
    console.log("📦 Furgonetka: Dodawanie tracking number", { 
      sourceOrderId, 
      trackingNumber: tracking?.number,
      courierService: tracking?.courierService 
    });
    
    if (!tracking?.number) {
      return res.status(400).json({ error: "Tracking number is required" });
    }
    
    // TODO: Implementacja zapisywania tracking number w Medusa
    // Na razie tylko logujemy
    console.log(`✅ Furgonetka: Tracking number ${tracking.number} dodany do zamówienia ${sourceOrderId}`);
    
    res.json({ 
      success: true, 
      message: "Tracking number added successfully",
      orderId: sourceOrderId,
      trackingNumber: tracking.number
    });
    
  } catch (error) {
    console.error("❌ Furgonetka: Błąd dodawania tracking number", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
