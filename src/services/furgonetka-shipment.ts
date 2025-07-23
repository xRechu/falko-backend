/**
 * Furgonetka Shipment Service
 * Handles label generation and shipment creation
 */

import { furgonetkaOAuth } from './furgonetka-oauth';

export interface ShipmentData {
  sourceOrderId: string;
  service: string;
  senderAddress: Address;
  recipientAddress: Address;
  package: Package;
  pickupPoint?: PickupPoint;
}

export interface Address {
  company?: string;
  name: string;
  surname: string;
  street: string;
  city: string;
  postcode: string;
  countryCode: string;
  phone: string;
  email: string;
}

export interface Package {
  weight: number;
  length: number;
  width: number;
  height: number;
  value: number;
  codAmount?: number;
  description: string;
}

export interface PickupPoint {
  id: string;
  provider: string;
  name: string;
  address: string;
}

export interface ShipmentResult {
  shipment_id: string;
  tracking_number: string;
  label_url: string;
  status: string;
  furgonetka_response: any;
}

/**
 * Create shipment with Furgonetka API
 */
export async function createFurgonetkaShipment(order: any, furgonetkaData: any): Promise<ShipmentResult> {
  console.log('🚀 Creating Furgonetka shipment for order:', order.id);
  
  // Test OAuth connection
  const isConnected = await furgonetkaOAuth.testConnection();
  if (!isConnected) {
    throw new Error('Furgonetka OAuth connection failed. Check credentials.');
  }
  
  // Get access token
  const token = await furgonetkaOAuth.getAccessToken();
  console.log('🔑 OAuth token obtained');
  
  // Prepare shipment data according to Furgonetka API
  const shipmentPayload: ShipmentData = {
    sourceOrderId: order.id,
    service: mapDeliveryOptionToService(furgonetkaData.delivery_option),
    
    // Sender address (your store)
    senderAddress: {
      company: process.env.STORE_NAME || "Falko Project",
      name: process.env.STORE_CONTACT_NAME || "Falko",
      surname: process.env.STORE_CONTACT_SURNAME || "Project",
      street: process.env.STORE_ADDRESS || "ul. Przykładowa 1",
      city: process.env.STORE_CITY || "Warszawa",
      postcode: process.env.STORE_POSTCODE || "00-001",
      countryCode: "PL",
      phone: process.env.STORE_PHONE || "+48 123 456 789",
      email: process.env.STORE_EMAIL || "sklep@falkoproject.com"
    },
    
    // Recipient address (pickup point or customer)
    recipientAddress: {
      company: order.shipping_address.company || "",
      name: order.shipping_address.first_name,
      surname: order.shipping_address.last_name,
      street: order.shipping_address.address_1,
      city: order.shipping_address.city,
      postcode: order.shipping_address.postal_code,
      countryCode: order.shipping_address.country_code?.toUpperCase() || "PL",
      phone: order.shipping_address.phone || order.customer?.phone || "",
      email: order.customer?.email || ""
    },
    
    // Package details
    package: {
      weight: calculateOrderWeight(order),
      length: 30, // cm - default package size
      width: 20,  // cm
      height: 10, // cm
      value: order.total / 100, // Convert from cents to PLN
      codAmount: order.payment_method === 'cod' ? order.total / 100 : 0,
      description: `Zamówienie ${order.display_id} - ${order.items?.length || 0} produktów`
    }
  };
  
  // Add pickup point if applicable
  if (furgonetkaData.pickup_point) {
    shipmentPayload.pickupPoint = {
      id: furgonetkaData.pickup_point.id,
      provider: furgonetkaData.pickup_point.provider,
      name: furgonetkaData.pickup_point.name,
      address: furgonetkaData.pickup_point.address
    };
    console.log('📍 Pickup point added:', shipmentPayload.pickupPoint);
  }
  
  console.log('📤 Sending shipment to Furgonetka:', {
    ...shipmentPayload,
    senderAddress: { ...shipmentPayload.senderAddress, email: '[HIDDEN]' },
    recipientAddress: { ...shipmentPayload.recipientAddress, email: '[HIDDEN]' }
  });
  
  // Make API call to Furgonetka
  const response = await fetch(`${process.env.FURGONETKA_BASE_URL}/shipments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'FalkoProject/1.0'
    },
    body: JSON.stringify(shipmentPayload)
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    console.error('❌ Furgonetka API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData
    });
    throw new Error(`Furgonetka API error: ${response.status} - ${errorData}`);
  }
  
  const result = await response.json();
  console.log('✅ Furgonetka shipment created successfully:', {
    id: result.id,
    trackingNumber: result.trackingNumber,
    status: result.status
  });
  
  return {
    shipment_id: result.id,
    tracking_number: result.trackingNumber,
    label_url: result.labelUrl,
    status: result.status,
    furgonetka_response: result
  };
}

/**
 * Map delivery option to Furgonetka service code
 */
function mapDeliveryOptionToService(deliveryOption: any): string {
  if (!deliveryOption) {
    console.warn('⚠️ No delivery option provided, using default DPD');
    return 'dpd_classic';
  }
  
  const { provider, type } = deliveryOption;
  console.log('🗺️ Mapping delivery option:', { provider, type });
  
  // Map to Furgonetka service codes
  const serviceMap: Record<string, string> = {
    'inpost_pickup_point': 'inpost_paczkomaty',
    'dpd_pickup_point': 'dpd_pickup',
    'dhl_pickup_point': 'dhl_servicepoint',
    'gls_pickup_point': 'gls_parcelshop',
    'dpd_courier': 'dpd_classic',
    'dhl_courier': 'dhl_express',
    'gls_courier': 'gls_courier'
  };
  
  const serviceKey = `${provider}_${type}`;
  const mappedService = serviceMap[serviceKey] || 'dpd_classic';
  
  console.log('✅ Service mapped:', { serviceKey, mappedService });
  return mappedService;
}

/**
 * Calculate total order weight (in kg)
 */
function calculateOrderWeight(order: any): number {
  if (!order.items || order.items.length === 0) {
    console.log('📦 No items found, using default weight: 0.5kg');
    return 0.5;
  }
  
  const totalWeight = order.items.reduce((total: number, item: any) => {
    // Default weight per item if not specified
    const itemWeight = item.variant?.weight || 0.5; // 0.5kg default
    const itemTotal = itemWeight * item.quantity;
    
    console.log(`📦 Item: ${item.title} - Weight: ${itemWeight}kg x ${item.quantity} = ${itemTotal}kg`);
    return total + itemTotal;
  }, 0);
  
  console.log('📦 Total order weight:', totalWeight, 'kg');
  return Math.max(totalWeight, 0.1); // Minimum 0.1kg
}

/**
 * Get shipment status from Furgonetka
 */
export async function getFurgonetkaShipmentStatus(shipmentId: string): Promise<any> {
  const token = await furgonetkaOAuth.getAccessToken();
  
  const response = await fetch(`${process.env.FURGONETKA_BASE_URL}/shipments/${shipmentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get shipment status: ${response.status}`);
  }
  
  return await response.json();
}