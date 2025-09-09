import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IOrderModuleService } from "@medusajs/framework/types"
import { createFurgonetkaShipment } from "../../../../../services/furgonetka-shipment"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const orderId = req.params.id;
    console.log('📦 Generating Furgonetka label for order:', orderId);
    
    // Pobierz serwis zamówień z różnymi tokenami: module → 'order' → legacy service
  let order: any
  let updateOrder: (data: any) => Promise<any>
  // Uwaga: nie używamy zagnieżdżonych relacji (np. "items.variant"),
  // ponieważ w module zamówień (Mikro-ORM) może to powodować błędy strategii joinów.
  // Potrzebne pola wariantu są opcjonalne, a waga ma bezpieczny fallback.
  const relations = ["shipping_address", "billing_address", "items"]

    const tryResolveOrderModule = () => {
      const svc = req.scope.resolve("orderModuleService") as IOrderModuleService
      return {
        get: () => svc.retrieveOrder(orderId, { relations }),
  update: (data: any) => svc.updateOrders({ id: orderId, ...data }),
        tag: 'orderModuleService',
      }
    }
    const tryResolveOrderToken = () => {
      const svc = req.scope.resolve("order") as IOrderModuleService
      return {
        get: () => svc.retrieveOrder(orderId, { relations }),
  update: (data: any) => svc.updateOrders({ id: orderId, ...data }),
        tag: 'order (module token)',
      }
    }
    const tryResolveLegacyService = () => {
      const svc = req.scope.resolve("orderService") as any
      return {
        get: () => svc.retrieve(orderId, { relations }),
        update: (data: any) => svc.update(orderId, data),
        tag: 'orderService (legacy)',
      }
    }

    let adapter: { get: () => Promise<any>, update: (data: any) => Promise<any>, tag: string } | null = null
    const attempts = [tryResolveOrderModule, tryResolveOrderToken, tryResolveLegacyService]
    for (const attempt of attempts) {
      try {
        adapter = attempt()
        console.log(`🧩 Using ${adapter.tag}`)
        break
      } catch (_) {
        // try next
      }
    }
    if (!adapter) {
      return res.status(500).json({ success: false, error: "Unable to resolve any order service (orderModuleService/order/orderService)" })
    }

    try {
      order = await adapter.get()
    } catch (e: any) {
      console.warn('⚠️ Failed to retrieve order with relations, retrying without relations. Reason:', e?.message)
      // Spróbuj pobrać zamówienie minimalnie (bez relacji), różne API mogą wymagać innego podpisu
      try {
        const svcAny: any = (adapter as any)
        if (svcAny?.tag?.includes('legacy')) {
          const legacy = req.scope.resolve("orderService") as any
          order = await legacy.retrieve(orderId)
        } else {
          const om = req.scope.resolve("orderModuleService") as any
          order = await om.retrieveOrder(orderId)
        }
      } catch (e2: any) {
        console.warn('⚠️ Fallback retrieveOrder without relations failed, using query.graph. Reason:', e2?.message)
        try {
          const query = req.scope.resolve("query") as any
          const fields = [
            "id",
            "display_id",
            "total",
            "currency_code",
            "email",
            "metadata",
            "shipping_address",
            "billing_address",
            "items",
          ]
          const result = await query.graph({
            entity: "order",
            fields,
            filters: { id: orderId },
          })
          const data = Array.isArray(result?.data) ? result.data[0] : result?.data
          order = data || null
        } catch (e3: any) {
          console.error('❌ query.graph fallback failed:', e3?.message)
          throw e
        }
      }
    }
    updateOrder = adapter.update
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    console.log('📋 Order retrieved:', {
      id: order?.id,
      display_id: order?.display_id,
      shipping_address: order?.shipping_address?.city,
      metadata: !!order?.metadata?.furgonetka_data
    });
    
    // Extract Furgonetka data from order metadata
  const furgonetkaData = order?.metadata?.furgonetka_data;
    if (!furgonetkaData) {
      return res.status(400).json({
        success: false,
        error: 'Order does not contain Furgonetka shipping data. This order was not placed with Furgonetka delivery.'
      });
    }
    
    console.log('🎯 Furgonetka data found:', {
      hasData: !!furgonetkaData,
      delivery_option: furgonetkaData?.delivery_option,
      has_pickup_point: !!furgonetkaData?.pickup_point
    });
    
    // Check if label already exists
    if (order.metadata?.furgonetka_shipment) {
      console.log('⚠️ Label already exists for this order');
      return res.json({
        success: true,
        ...order.metadata.furgonetka_shipment,
        message: 'Label already generated for this order'
      });
    }
    
  // Create shipment with Furgonetka API (real)
  const shipmentData = await createFurgonetkaShipment(order, furgonetkaData)
    
    // Update order with tracking information (best-effort)
    try {
      await updateOrder({
        metadata: {
          ...order.metadata,
          furgonetka_shipment: {
            shipment_id: shipmentData.shipment_id,
            tracking_number: shipmentData.tracking_number,
            label_url: shipmentData.label_url,
            status: shipmentData.status,
            created_at: new Date().toISOString(),
          },
        },
      })
    } catch (e) {
      console.warn('⚠️ Failed to update order metadata with Furgonetka shipment. Continuing.', e)
    }
    
  console.log('✅ Furgonetka label generated and order updated');
    res.json({
      success: true,
      ...shipmentData
    });
    
  } catch (error) {
    console.error('❌ Error generating Furgonetka label:', error);
    res.status(500).json({
      success: false,
  error: (error as any)?.message || 'Failed to generate label',
    });
  }
}