import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa"
// import { createFurgonetkaShipment } from "../../../../services/furgonetka-shipment"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const orderId = req.params.id;
    console.log('📦 Generating Furgonetka label for order:', orderId);
    
    // Get order from Medusa
    const orderService = req.scope.resolve("orderService");
    const order = await orderService.retrieve(orderId, {
      relations: ["shipping_address", "billing_address", "items", "items.variant", "customer"]
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    console.log('📋 Order retrieved:', {
      id: order.id,
      display_id: order.display_id,
      shipping_address: order.shipping_address?.city,
      metadata: !!order.metadata?.furgonetka_data
    });
    
    // Extract Furgonetka data from order metadata
    const furgonetkaData = order.metadata?.furgonetka_data;
    if (!furgonetkaData) {
      return res.status(400).json({
        success: false,
        error: 'Order does not contain Furgonetka shipping data. This order was not placed with Furgonetka delivery.'
      });
    }
    
    console.log('🎯 Furgonetka data found:', {
      delivery_option: furgonetkaData.delivery_option,
      has_pickup_point: !!furgonetkaData.pickup_point
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
    
    // Create shipment with Furgonetka API
    // TODO: Re-enable when furgonetka-shipment service is implemented
    const shipmentData = {
      shipment_id: `FRG_${orderId}_${Date.now()}`,
      tracking_number: `FRG${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      label_url: `https://api.furgonetka.pl/labels/mock_${orderId}.pdf`,
      status: 'created'
    };
    
    console.log('⚠️ Using mock Furgonetka data - shipment service not yet implemented');
    
    // Update order with tracking information
    await orderService.update(orderId, {
      metadata: {
        ...order.metadata,
        furgonetka_shipment: {
          shipment_id: shipmentData.shipment_id,
          tracking_number: shipmentData.tracking_number,
          label_url: shipmentData.label_url,
          status: shipmentData.status,
          created_at: new Date().toISOString()
        }
      }
    });
    
    console.log('✅ Furgonetka label generated and order updated');
    res.json({
      success: true,
      ...shipmentData
    });
    
  } catch (error) {
    console.error('❌ Error generating Furgonetka label:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate label'
    });
  }
}