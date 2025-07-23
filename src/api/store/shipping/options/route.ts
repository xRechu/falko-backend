/**
 * API endpoint dla opcji dostawy Furgonetka.pl
 * Używa OAuth service do pobierania dostępnych usług kurierskich
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { furgonetkaOAuth } from "../../../../services/furgonetka-oauth";

interface ShippingOptionsRequest {
  delivery_address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  package_weight: number; // kg
  package_value: number;  // PLN
  package_dimensions?: {
    length: number; // cm
    width: number;  // cm
    height: number; // cm
  };
}

interface ShippingOption {
  id: string;
  provider: string;
  service: string;
  type: 'courier' | 'pickup_point';
  price: number;
  delivery_time: string;
  description: string;
  logo: string;
  features: string[];
}

// CORS Middleware
function setCorsHeaders(res: MedusaResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * OPTIONS /store/shipping/options
 * Handle preflight requests
 */
export async function OPTIONS(
  req: MedusaRequest,
  res: MedusaResponse
) {
  setCorsHeaders(res);
  return res.status(200).end();
}

/**
 * POST /store/shipping/options
 * Pobierz dostępne opcje dostawy z Furgonetka.pl
 */
export async function POST(
  req: MedusaRequest<ShippingOptionsRequest>,
  res: MedusaResponse
) {
  try {
    setCorsHeaders(res);
    
    const { delivery_address, package_weight, package_value, package_dimensions } = req.body;

    if (!delivery_address || !package_weight || !package_value) {
      return res.status(400).json({
        type: "invalid_data",
        message: "Missing required fields: delivery_address, package_weight, package_value"
      });
    }

    console.log('🚚 Pobieranie opcji dostawy Furgonetka:', {
      address: delivery_address,
      weight: package_weight,
      value: package_value
    });

    // Sprawdź połączenie OAuth
    const isConnected = await furgonetkaOAuth.testConnection();
    if (!isConnected) {
      console.warn('⚠️ Furgonetka OAuth nie działa, używam mock danych');
      return res.status(200).json({
        options: getMockShippingOptions(),
        source: 'mock'
      });
    }

    // Pobierz dostępne usługi z Furgonetka API
    const availableServices = await furgonetkaOAuth.getAvailableServices();
    console.log('📋 Dostępne usługi Furgonetka:', availableServices);

    // Oblicz ceny dla każdej usługi
    const shippingOptions: ShippingOption[] = [];
    
    for (const service of availableServices) {
      try {
        const packageData = buildPackageData(delivery_address, package_weight, package_value, package_dimensions, service);
        const priceResponse = await furgonetkaOAuth.calculateShippingPrice(packageData);
        
        if (priceResponse && priceResponse.price) {
          const option = mapServiceToShippingOption(service, priceResponse);
          shippingOptions.push(option);
        }
      } catch (error) {
        console.warn(`⚠️ Błąd kalkulacji ceny dla ${service.name}:`, error);
        // Pomiń tę usługę jeśli kalkulacja się nie udała
      }
    }

    // Jeśli nie ma opcji z API, użyj mock danych
    if (shippingOptions.length === 0) {
      console.warn('⚠️ Brak opcji z API, używam mock danych');
      return res.status(200).json({
        options: getMockShippingOptions(),
        source: 'mock'
      });
    }

    console.log(`✅ Znaleziono ${shippingOptions.length} opcji dostawy`);
    
    return res.status(200).json({
      options: shippingOptions,
      source: 'furgonetka_api'
    });

  } catch (error) {
    console.error('❌ Błąd pobierania opcji dostawy:', error);
    
    // Fallback do mock danych w przypadku błędu
    return res.status(200).json({
      options: getMockShippingOptions(),
      source: 'mock_fallback',
      error: error.message
    });
  }
}

/**
 * Buduje dane paczki dla API Furgonetka
 */
function buildPackageData(
  address: any, 
  weight: number, 
  value: number, 
  dimensions: any, 
  service: any
) {
  return {
    receiver: {
      name: "Jan Kowalski", // TODO: Pobierz z customer data
      email: "customer@example.com",
      phone: "+48123456789",
      address: {
        street: address.street,
        city: address.city,
        postal_code: address.postal_code,
        country_code: address.country || "PL"
      }
    },
    package: {
      weight: weight,
      value: value,
      dimensions: dimensions || {
        length: 20,
        width: 15,
        height: 10
      }
    },
    service: {
      name: service.name,
      options: service.available_options || []
    }
  };
}

/**
 * Mapuje usługę Furgonetka na nasz format ShippingOption
 */
function mapServiceToShippingOption(service: any, priceResponse: any): ShippingOption {
  const provider = service.name.toLowerCase();
  
  return {
    id: `furgonetka-${service.id}`,
    provider: provider,
    service: service.display_name || service.name,
    type: service.pickup_points_available ? 'pickup_point' : 'courier',
    price: priceResponse.price,
    delivery_time: service.delivery_time || '1-3 dni robocze',
    description: service.description || `Dostawa ${service.name}`,
    logo: `/logos/${provider}.png`,
    features: buildServiceFeatures(service)
  };
}

/**
 * Buduje listę funkcji usługi
 */
function buildServiceFeatures(service: any): string[] {
  const features: string[] = [];
  
  if (service.tracking_available) features.push('Tracking');
  if (service.insurance_available) features.push('Ubezpieczenie');
  if (service.pickup_points_available) features.push('Punkty odbioru');
  if (service.cod_available) features.push('Pobranie');
  if (service.saturday_delivery) features.push('Soboty');
  
  return features;
}

/**
 * Mock dane dla development
 */
function getMockShippingOptions(): ShippingOption[] {
  return [
    {
      id: 'dpd-classic',
      provider: 'dpd',
      service: 'DPD Classic',
      type: 'courier',
      price: 15.99,
      delivery_time: '1-2 dni robocze',
      description: 'Dostawa kurierska do drzwi',
      logo: '/logos/dpd.svg',
      features: ['Tracking', 'Ubezpieczenie']
    },
    {
      id: 'dpd-pickup',
      provider: 'dpd',
      service: 'DPD Pickup',
      type: 'pickup_point',
      price: 12.99,
      delivery_time: '1-2 dni robocze',
      description: 'Odbiór w punkcie DPD',
      logo: '/logos/dpd.svg',
      features: ['Tracking', 'Punkt odbioru']
    },
    {
      id: 'inpost-paczkomaty',
      provider: 'inpost',
      service: 'InPost Paczkomaty',
      type: 'pickup_point',
      price: 12.99,
      delivery_time: '1-2 dni robocze',
      description: 'Odbiór w Paczkomacie 24/7',
      logo: '/logos/inpost.svg',
      features: ['24/7', 'Eco-friendly']
    },
    {
      id: 'dhl-servicepoint',
      provider: 'dhl',
      service: 'DHL ServicePoint',
      type: 'pickup_point',
      price: 13.99,
      delivery_time: '1-3 dni robocze',
      description: 'Odbiór w punkcie DHL',
      logo: '/logos/dhl.svg',
      features: ['Tracking', 'Punkt odbioru']
    },
    {
      id: 'gls-courier',
      provider: 'gls',
      service: 'GLS Courier',
      type: 'courier',
      price: 14.99,
      delivery_time: '1-2 dni robocze',
      description: 'Dostawa kurierska GLS',
      logo: '/logos/gls.svg',
      features: ['Tracking', 'SMS']
    }
  ];
}
