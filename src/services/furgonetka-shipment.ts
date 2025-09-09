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
  
  // Sprawdzenie konfiguracji OAuth i próba pobrania tokenu (z precyzyjną diagnostyką)
  const missingEnv: string[] = []
  if (!process.env.FURGONETKA_OAUTH_CLIENT_ID) missingEnv.push('FURGONETKA_OAUTH_CLIENT_ID')
  if (!process.env.FURGONETKA_OAUTH_CLIENT_SECRET) missingEnv.push('FURGONETKA_OAUTH_CLIENT_SECRET')
  const baseUrlHint = process.env.FURGONETKA_BASE_URL || 'https://api.sandbox.furgonetka.pl'
  if (missingEnv.length) {
    throw new Error(
      `Furgonetka OAuth not configured: missing ${missingEnv.join(', ')}. ` +
      `Set these in falko-backend/.env. Using base URL: ${baseUrlHint}`
    )
  }

  try {
    await furgonetkaOAuth.getAccessToken()
  } catch (e: any) {
    const msg = e?.message || String(e)
    throw new Error(`Furgonetka OAuth failed to obtain token (${baseUrlHint}): ${msg}`)
  }

  // (Token uzyska authenticatedRequest)
  console.log('🔑 Preparing authenticated shipment request');
  
  // Prepare internal shipment data
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
      company: order?.shipping_address?.company || "",
      name: order?.shipping_address?.first_name || (order?.billing_address?.first_name ?? ""),
      surname: order?.shipping_address?.last_name || (order?.billing_address?.last_name ?? ""),
      street: order?.shipping_address?.address_1 || (order?.billing_address?.address_1 ?? ""),
      city: order?.shipping_address?.city || (order?.billing_address?.city ?? ""),
      postcode: order?.shipping_address?.postal_code || (order?.billing_address?.postal_code ?? ""),
      countryCode: (order?.shipping_address?.country_code || order?.billing_address?.country_code || "PL")?.toUpperCase(),
      phone: order?.shipping_address?.phone || order?.billing_address?.phone || "",
      email: order?.email || ""
    },
    
    // Package details
    package: {
      weight: calculateOrderWeight(order),
      length: 30, // cm - default package size
      width: 20,  // cm
      height: 10, // cm
  value: (typeof order?.total === 'number' ? order.total : 0) / 100, // Convert from cents to PLN
  codAmount: order?.payment_method === 'cod' ? ((typeof order?.total === 'number' ? order.total : 0) / 100) : 0,
  description: buildPackageDescription(order)
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
  
  // Map to Furgonetka API payload shape (best-effort based on docs patterns)
  const provider = (furgonetkaData?.delivery_option?.provider || '').toLowerCase() || 'dpd'
  let serviceType = (furgonetkaData?.delivery_option?.type === 'pickup_point') ? 'service_point' : 'courier'
  // Specjalny przypadek InPost: paczkomaty zwykle oznaczane jako parcel_machine
  if (provider === 'inpost' && serviceType === 'service_point') {
    serviceType = 'parcel_machine'
  }
  const serviceCode = shipmentPayload.service || mapDeliveryOptionToService(furgonetkaData?.delivery_option)

  const apiPayload: any = {
    service: serviceCode,
    service_type: serviceType,
    source_order_id: order.id,
    sender: {
      company: shipmentPayload.senderAddress.company || undefined,
      name: shipmentPayload.senderAddress.name,
      surname: shipmentPayload.senderAddress.surname,
      email: shipmentPayload.senderAddress.email,
      phone: shipmentPayload.senderAddress.phone,
      address: {
        street: shipmentPayload.senderAddress.street,
        city: shipmentPayload.senderAddress.city,
        postal_code: shipmentPayload.senderAddress.postcode,
        country_code: shipmentPayload.senderAddress.countryCode || 'PL',
      },
    },
    receiver: {
      company: shipmentPayload.recipientAddress.company || undefined,
      name: shipmentPayload.recipientAddress.name,
      surname: shipmentPayload.recipientAddress.surname,
      email: shipmentPayload.recipientAddress.email,
      phone: shipmentPayload.recipientAddress.phone,
      address: {
        street: shipmentPayload.recipientAddress.street,
        city: shipmentPayload.recipientAddress.city,
        postal_code: shipmentPayload.recipientAddress.postcode,
        country_code: shipmentPayload.recipientAddress.countryCode || 'PL',
      },
    },
    packages: [
      {
        weight: shipmentPayload.package.weight,
        dimensions: {
          length: shipmentPayload.package.length,
          width: shipmentPayload.package.width,
          height: shipmentPayload.package.height,
        },
        description: shipmentPayload.package.description,
        value: shipmentPayload.package.value,
      },
    ],
  }

  if (shipmentPayload.package.codAmount && shipmentPayload.package.codAmount > 0) {
    apiPayload.cod = { amount: shipmentPayload.package.codAmount }
  }
  if (shipmentPayload.pickupPoint?.id) {
    apiPayload.point = {
      code: shipmentPayload.pickupPoint.id,
      provider: (shipmentPayload.pickupPoint.provider || provider).toLowerCase(),
    }
  }

  console.log('📤 Sending shipment to Furgonetka (mapped):', {
    ...apiPayload,
    sender: { ...apiPayload.sender, email: '[HIDDEN]', phone: '[HIDDEN]' },
    receiver: { ...apiPayload.receiver, email: '[HIDDEN]', phone: '[HIDDEN]' },
  })
  
  // Make API call to Furgonetka via OAuth helper (handles base URL + headers)
  const tryEndpoints = ['/shipments', '/packages']
  let response: Response | null = null
  let lastErr: { endpoint: string; status: number; statusText: string; body: string } | null = null

  for (const ep of tryEndpoints) {
    const r = await furgonetkaOAuth.authenticatedRequest(ep, {
      method: 'POST',
      body: JSON.stringify(apiPayload),
    })
    if (r.ok) {
      response = r
      break
    }
    const txt = await r.text().catch(() => '')
    lastErr = { endpoint: ep, status: r.status, statusText: r.statusText, body: txt }
    // jeśli mamy 405/404, spróbuj kolejny endpoint; dla innych błędów też próbujemy jeden fallback
  }

  if (!response) {
    // Dodatkowa diagnostyka: sprawdź dostępne usługi konta, jeśli to 401
    if (lastErr?.status === 401) {
      try {
        const servicesResp = await furgonetkaOAuth.getAvailableServices()
        console.warn('ℹ️ Furgonetka available services for account:', servicesResp)
      } catch (e) {
        console.warn('ℹ️ Could not fetch available services:', (e as any)?.message)
      }
    }
    console.error('❌ Furgonetka API create shipment failed on all endpoints:', lastErr)
    const details = lastErr ? `${lastErr.endpoint} -> ${lastErr.status} ${lastErr.statusText} ${lastErr.body || ''}` : 'no response'
    throw new Error(`Furgonetka API error: ${details}`)
  }

  const result = await response.json();
  const shipmentId = result.id || result.shipmentId || result.shipment_id;
  const trackingNumber = result.trackingNumber || result.tracking_number;
  const labelUrl = result.labelUrl || result.label_url;
  console.log('✅ Furgonetka shipment created successfully:', {
    id: shipmentId,
    trackingNumber,
    status: result.status
  });
  
  return {
  shipment_id: shipmentId,
  tracking_number: trackingNumber,
  label_url: labelUrl,
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
 * Build human-readable description including item names and prices.
 * Example: "Zamówienie 1234 | 2x Książka A @ 29.99 PLN; 1x Komiks B @ 19.50 PLN | Razem: 79.48 PLN"
 */
function buildPackageDescription(order: any): string {
  const orderNo = order.display_id ?? order.id;
  const currency = (order.currency_code || 'PLN').toUpperCase();
  const items: any[] = Array.isArray(order.items) ? order.items : [];

  const parts: string[] = [];
  for (const item of items) {
    try {
      const qty = item.quantity ?? 1;
      const name = (item.title || item.product_title || 'Produkt').toString();
      // unit_price could be in smallest unit (e.g., grosze). Assume cents and convert.
      const unitPrice = typeof item.unit_price === 'number' ? item.unit_price / 100 : 0;
      const formatted = `${qty}x ${name} @ ${unitPrice.toFixed(2)} ${currency}`;
      parts.push(formatted);
    } catch (_) {
      // skip faulty item formatting
    }
  }

  const total = typeof order.total === 'number' ? (order.total / 100) : undefined;
  const header = `Zamówienie ${orderNo}`;
  const itemsStr = parts.join('; ');
  const totalStr = typeof total === 'number' ? ` | Razem: ${total.toFixed(2)} ${currency}` : '';
  let desc = `${header} | ${itemsStr}${totalStr}`.trim();

  // Furgonetka might have length limits; keep description reasonably short (e.g., 500 chars)
  const MAX_LEN = 500;
  if (desc.length > MAX_LEN) {
    desc = desc.slice(0, MAX_LEN - 3) + '...';
  }
  return desc;
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