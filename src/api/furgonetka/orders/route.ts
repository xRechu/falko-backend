/**
 * API routes dla integracji Furgonetka.pl
 * Zgodne z dokumentacją: https://furgonetka.pl/api/universal-integration-example
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { furgonetkaOAuth } from "../../../services/furgonetka-oauth";

/**
 * GET /furgonetka/orders
 * Pobieranie zamówień ze sklepu
 * 
 * Query parameters:
 * - datetime: Data zmiany ostatniego pobranego zamówienia (ISO 8601)
 * - limit: Maksymalna ilość zamówień (default: 100)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Test OAuth connection na początku
    console.log("🔐 Furgonetka: Sprawdzanie połączenia OAuth...");
    const isConnected = await furgonetkaOAuth.testConnection();
    if (!isConnected) {
      console.error("❌ Furgonetka OAuth: Błąd połączenia");
      return res.status(500).json({ error: "OAuth connection failed" });
    }

    // Sprawdź autoryzację Furgonetka (webhook token)
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
    
    const { datetime, limit = 100 } = req.query;
    
    console.log("📦 Furgonetka: Pobieranie zamówień", { datetime, limit });
    
    // TODO: Implementacja pobierania zamówień z Medusa
    // Na razie zwracamy pustą tablicę
    const orders: any[] = [];
    
    // Format odpowiedzi zgodny z dokumentacją Furgonetka
    const furgonetkaOrders = orders.map((order: any) => ({
      sourceOrderId: order.id,
      sourceClientId: order.customer_id,
      datetimeOrder: order.created_at,
      sourceDatetimeChange: order.updated_at,
      service: order.shipping_method?.furgonetka_service || "dpd",
      serviceDescription: order.shipping_method?.name || "Kurier DPD",
      status: order.payment_status === "captured" ? "paid" : "pending",
      totalPrice: order.total / 100, // Medusa używa groszów
      shippingCost: order.shipping_total / 100,
      shippingMethodId: order.shipping_method?.id,
      shippingTaxRate: 23,
      totalPaid: order.paid_total / 100,
      codAmount: order.payment_method === "cod" ? order.total / 100 : 0,
      totalWeight: calculateOrderWeight(order),
      point: order.shipping_address?.furgonetka_point,
      comment: order.metadata?.comment || "",
      shippingAddress: {
        company: order.shipping_address?.company || "",
        name: order.shipping_address?.first_name || "",
        surname: order.shipping_address?.last_name || "",
        street: `${order.shipping_address?.address_1} ${order.shipping_address?.address_2 || ""}`.trim(),
        city: order.shipping_address?.city || "",
        postcode: order.shipping_address?.postal_code || "",
        countryCode: order.shipping_address?.country_code?.toUpperCase() || "PL",
        phone: order.shipping_address?.phone || "",
        email: order.email || ""
      },
      invoiceAddress: {
        company: order.billing_address?.company || "",
        name: order.billing_address?.first_name || "",
        surname: order.billing_address?.last_name || "",
        street: `${order.billing_address?.address_1} ${order.billing_address?.address_2 || ""}`.trim(),
        city: order.billing_address?.city || "",
        postcode: order.billing_address?.postal_code || "",
        countryCode: order.billing_address?.country_code?.toUpperCase() || "PL",
        phone: order.billing_address?.phone || "",
        email: order.email || "",
        nip: order.billing_address?.metadata?.nip || ""
      },
      products: order.items?.map((item: any) => ({
        id: item.variant_id,
        name: item.title,
        quantity: item.quantity,
        price: item.unit_price / 100,
        weight: item.variant?.weight || 0.5 // domyślna waga 0.5kg
      })) || [],
      paymentDatetime: order.payments?.[0]?.captured_at || null
    }));
    
    console.log(`✅ Furgonetka: Zwracam ${furgonetkaOrders.length} zamówień`);
    res.json(furgonetkaOrders);
    
  } catch (error) {
    console.error("❌ Furgonetka: Błąd pobierania zamówień", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Helper function do obliczania wagi zamówienia
 */
function calculateOrderWeight(order: any): number {
  if (!order.items) return 0.5;
  
  return order.items.reduce((total: number, item: any) => {
    const itemWeight = item.variant?.weight || 0.5; // domyślna waga produktu
    return total + (itemWeight * item.quantity);
  }, 0);
}
