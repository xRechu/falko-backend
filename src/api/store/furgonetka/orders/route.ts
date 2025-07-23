/**
 * Webhook endpoint dla Furgonetka.pl - pobieranie zamówień
 * Umieszczony w /store/ routing z wyłączoną autoryzacją dla webhook'ów
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { furgonetkaOAuth } from "../../../../services/furgonetka-oauth";

// Wyłącz autoryzację dla webhook'ów Furgonetka
export const AUTHENTICATE = false;

/**
 * GET /store/furgonetka/orders
 * Webhook endpoint dla Furgonetka.pl do pobierania zamówień
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("📦 Furgonetka Webhook: Otrzymano zapytanie o zamówienia");
    
    // Sprawdź autoryzację webhook (nie OAuth - to jest dla webhook'ów)
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.FURGONETKA_WEBHOOK_TOKEN;
    
    if (!authHeader || !expectedToken) {
      console.warn('🚨 Furgonetka Webhook: Brak autoryzacji');
      return res.status(401).json({ error: 'Authorization required' });
    }
    
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (token !== expectedToken) {
      console.warn('🚨 Furgonetka Webhook: Nieprawidłowy token');
      return res.status(401).json({ error: 'Invalid authorization token' });
    }

    // Test OAuth connection (dla naszych zapytań do Furgonetka API)
    try {
      console.log("🔐 Testowanie OAuth connection...");
      const isConnected = await furgonetkaOAuth.testConnection();
      if (!isConnected) {
        console.warn("⚠️  OAuth connection failed, ale webhook nadal zwróci dane");
      }
    } catch (oauthError) {
      console.warn("⚠️  OAuth error:", oauthError);
    }

    const { datetime, limit = 100 } = req.query;
    
    console.log("📦 Furgonetka: Pobieranie zamówień", { datetime, limit });
    
    // Pobierz zamówienia z Medusa używając query builder
    const query = req.scope.resolve("query");
    
    // Utwórz filtr dla zamówień
    const orderFilters: any = {
      status: ["pending", "completed"],
    };
    
    // Jeśli podano datetime, filtruj po dacie
    if (datetime) {
      orderFilters.created_at = {
        gte: new Date(datetime as string).toISOString()
      };
    }
    
    // Pobierz zamówienia z relacjami
    const orderQueryConfig = {
      select: [
        "id",
        "display_id", 
        "status",
        "payment_status",
        "fulfillment_status",
        "total",
        "currency_code",
        "created_at",
        "updated_at",
        "email",
        "metadata"
      ],
      relations: [
        "shipping_address",
        "billing_address", 
        "items",
        "items.variant",
        "shipping_methods",
        "customer"
      ],
      take: parseInt(limit as string),
      order: { created_at: "DESC" }
    };
    
    const { data: orders } = await query.graph({
      entity: "order",
      fields: orderQueryConfig.select,
      filters: orderFilters,
      pagination: {
        take: orderQueryConfig.take,
        order: orderQueryConfig.order
      }
    });
    
    console.log(`📦 Pobrano ${orders.length} zamówień z Medusa`);
    
    // TODO: Implementacja pobierania zamówień z Medusa
    // Na razie zwracamy pustą tablicę
    // const orders: any[] = [];
    
    // Format odpowiedzi zgodny z dokumentacją Furgonetka
    const furgonetkaOrders = orders.map((order: any) => ({
      sourceOrderId: order.id,
      sourceClientId: order.customer_id,
      datetimeOrder: order.created_at,
      sourceDatetimeChange: order.updated_at,
      service: order.shipping_method?.furgonetka_service || "dpd",
      serviceDescription: order.shipping_method?.name || "Kurier DPD",
      status: order.payment_status === "captured" ? "paid" : "pending",
      totalPrice: order.total / 100,
      currency: order.currency_code?.toUpperCase() || "PLN",
      
      // Dane klienta
      recipientName: `${order.shipping_address?.first_name} ${order.shipping_address?.last_name}`,
      recipientPhone: order.shipping_address?.phone || "",
      recipientEmail: order.email,
      
      // Adres dostawy
      recipientAddress: {
        street: order.shipping_address?.address_1 || "",
        houseNumber: order.shipping_address?.address_2 || "",
        postalCode: order.shipping_address?.postal_code || "",
        city: order.shipping_address?.city || "",
        country: order.shipping_address?.country_code?.toUpperCase() || "PL"
      },
      
      // Paczka
      package: {
        weight: calculatePackageWeight(order.items),
        dimensions: {
          length: 30,
          width: 20,
          height: 10
        }
      },
      
      // Pozycje zamówienia
      items: order.items?.map((item: any) => ({
        name: item.title,
        quantity: item.quantity,
        price: item.unit_price / 100,
        weight: item.variant?.weight || 0.5
      })) || []
    }));
    
    console.log(`✅ Furgonetka: Zwracam ${furgonetkaOrders.length} zamówień`);
    
    return res.status(200).json(furgonetkaOrders);
    
  } catch (error) {
    console.error("❌ Furgonetka Webhook Error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
}

/**
 * Pomocnicza funkcja do obliczania wagi paczki
 */
function calculatePackageWeight(items: any[]): number {
  if (!items?.length) return 0.5; // Domyślna waga
  
  return items.reduce((total, item) => {
    const itemWeight = item.variant?.weight || 0.5; // Domyślnie 0.5kg per item
    return total + (itemWeight * item.quantity);
  }, 0);
}
