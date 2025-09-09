/**
 * Proxy endpoint dla pobierania punktów odbioru z Furgonetka API
 * Ominięcie problemów CORS przez przekierowanie zapytań przez nasz backend
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { furgonetkaOAuth } from "../../../../services/furgonetka-oauth";

// Middleware do pomijania wymagania API key dla tego endpointu
export const AUTHENTICATE = false;

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Enforce POST-only contract (no mock data)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Language, x-publishable-api-key')
  return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST /store/furgonetka/points' })
}

export async function GET_OLD(req: MedusaRequest, res: MedusaResponse) {
  try {
    
    // Pobierz parametry zapytania
    const { 
      city, 
      street, 
      courierServices, 
      type, 
      zoom 
    } = req.query;
    
    console.log('🗺️ Pobieranie punktów odbioru:', req.query);
    
    // Sprawdź czy endpoint punktów nie wymaga autoryzacji (zgodnie z dokumentacją)
    // Niektóre endpointy Furgonetka są publiczne
    const baseUrl = 'https://api.furgonetka.pl'; // Spróbuj production API
    
    // Buduj dane do POST request zgodnie z dokumentacją Furgonetka API
    const requestBody: any = {
      location: {
        search_phrase: city as string || 'Warszawa'
      },
      filters: {
        services: courierServices ? [courierServices as string] : [],
        type: type as string || 'parcel_machine'
      }
    };
    
    // Jeśli podano ulicę, użyj address zamiast search_phrase
    if (street) {
      requestBody.location = {
        address: {
          city: city as string || 'Warszawa',
          street: street as string
        }
      };
    }
    
    console.log('🔗 POST request do Furgonetka /points/map:', requestBody);
    
    // Najpierw spróbuj bez autoryzacji (punkty mogą być publiczne)
    let response = await fetch(`${baseUrl}/points/map`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.furgonetka.v1+json',
        'Accept': 'application/vnd.furgonetka.v1+json',
        'X-Language': 'pl_PL'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Jeśli unauthorized, spróbuj z OAuth
    if (response.status === 401) {
      console.log('🔐 Endpoint wymaga autoryzacji, próba z OAuth...');
      response = await furgonetkaOAuth.authenticatedRequest('/points/map', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Błąd pobierania punktów:', response.status, response.statusText);
      console.error('❌ Treść błędu:', errorText);
      
      return res.status(response.status).json({
        error: 'Failed to fetch pickup points',
        details: `${response.status}: ${response.statusText}`,
        furgonetka_error: errorText
      });
    }
    
    const pointsData = await response.json();
    console.log('✅ Pobrano punkty odbioru:', pointsData);
    
    // Sprawdź strukturę odpowiedzi - mogą być różne formaty
    let points: any[] = [];
    if (Array.isArray(pointsData)) {
      points = pointsData;
    } else if (pointsData.points && Array.isArray(pointsData.points)) {
      points = pointsData.points;
    } else if (pointsData.data && Array.isArray(pointsData.data)) {
      points = pointsData.data;
    }
    
    console.log(`📍 Znaleziono ${points.length} punktów`);
    
    // Zwróć dane z odpowiednimi nagłówkami CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json({
      success: true,
      points: points,
      total: points.length,
      raw_response: pointsData // na wypadek debugowania
    });
    
  } catch (error) {
    console.error('❌ Błąd proxy punktów odbioru:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log('🗺️ POST /points dla Furgonetka Map API');
    
    // Używaj rawBody jeśli jest dostępne, albo req.body jako fallback
    let bodyData: any;
    if (req.rawBody) {
      try {
        bodyData = JSON.parse(req.rawBody.toString());
      } catch (e) {
        bodyData = req.body || {};
      }
    } else {
      bodyData = req.body || {};
    }
    
    console.log('📦 Incoming body:', JSON.stringify(bodyData, null, 2));

    // Jeśli przychodzi już zgodna struktura, przekaż bez zmian
    let requestBody: any;
    if (bodyData && typeof bodyData === 'object' && bodyData.location) {
      requestBody = bodyData;
    } else {
      // Zmapuj uproszczony payload z frontu na strukturę Furgonetka
      const city = (bodyData.city || bodyData?.address?.city || 'Warszawa').toString().trim();
      const street = (bodyData.street || bodyData?.address?.street || '').toString().trim();
      const postal_code = (bodyData.postal_code || bodyData.postcode || bodyData?.address?.postal_code || bodyData?.address?.postcode || '').toString().trim();
      const coordinates = bodyData.coordinates || bodyData.location?.coordinates || undefined;
      const courierServices: string[] = Array.isArray(bodyData.courierServices)
        ? bodyData.courierServices
        : (bodyData.courierServices ? [String(bodyData.courierServices)] : []);

      // Mapuj 'pickup_point' na oczekiwane przez Furgonetka typy
      const normalizeType = (incoming?: string, services: string[] = []): 'parcel_machine' | 'service_point' => {
        const hasInpost = services.some((s) => s?.toLowerCase() === 'inpost');
        if (!incoming || incoming === 'pickup_point') {
          return hasInpost ? 'parcel_machine' : 'service_point';
        }
        if (incoming === 'parcel_machine' || incoming === 'service_point') return incoming;
        return hasInpost ? 'parcel_machine' : 'service_point';
      };
      const type = normalizeType(bodyData.type, courierServices);

      // Preferuj location.address nad search_phrase (bardziej kompatybilne dla DHL/DPD/GLS)
      const address: any = { city, country_code: 'PL' };
      if (street) address.street = street;
      if (postal_code) address.postal_code = postal_code;

      const location: any = { address };
      if (coordinates?.latitude && coordinates?.longitude) {
        location.coordinates = {
          latitude: Number(coordinates.latitude),
          longitude: Number(coordinates.longitude),
        };
      }

      requestBody = {
        location,
        filters: {
          services: courierServices,
          type,
        },
      };

      if (bodyData.zoom != null) {
        requestBody.zoom = bodyData.zoom;
      }
    }

    console.log('📤 Outgoing /points/map body:', JSON.stringify(requestBody, null, 2));

    // Helper do wykonania żądania
    const doRequest = async (body: any) => {
      const resp = await furgonetkaOAuth.authenticatedRequest('/points/map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.furgonetka.v1+json',
          'Accept': 'application/vnd.furgonetka.v1+json',
          'X-Language': 'pl_PL'
        },
        body: JSON.stringify(body || {})
      });
      return resp;
    };

  // Pierwsza próba z address
    let response = await doRequest(requestBody);

    // Jeśli błąd dotyczy location, spróbuj fallback na search_phrase
    if (!response.ok) {
      const text = await response.text();
      const isLocationError = text?.includes('"/location"') || text?.includes('\"/location\"') || text?.toLowerCase().includes('location');
      if (response.status === 404 && isLocationError) {
        const addr = requestBody?.location?.address || {};
        const phrase = [addr.street, addr.city, (addr as any).postal_code || bodyData.postal_code]
          .filter(Boolean)
          .join(' ') || addr.city || bodyData.city || 'Warszawa';
        const fallbackBody = {
          ...requestBody,
          location: { search_phrase: phrase }
        };
        console.warn('↩️ Fallback do search_phrase dla /location error. Body:', JSON.stringify(fallbackBody));
        response = await doRequest(fallbackBody);
        if (!response.ok) {
          console.error('❌ Fallback również niepowodzenie:', response.status);
          return res.status(response.status).json({ success: false, error: `Furgonetka API error after fallback: ${response.status} - ${text}` });
        }
      } else {
        console.error('❌ Furgonetka API error:', response.status);
        return res.status(response.status).json({ success: false, error: `Furgonetka API error: ${response.status} - ${text}` });
      }
    }

    const raw = await response.json();
    console.log('✅ Furgonetka API response:', raw);

    // Normalizuj odpowiedź do struktury oczekiwanej przez frontend
    let points: any[] = [];
    if (Array.isArray(raw)) {
      points = raw;
    } else if (raw?.points && Array.isArray(raw.points)) {
      points = raw.points;
    } else if (raw?.data && Array.isArray(raw.data)) {
      points = raw.data;
    }

    // Ustaw odpowiednie nagłówki CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Language, x-publishable-api-key');

    return res.status(200).json({ success: true, points, total: points.length, raw_response: raw });
    
  } catch (error) {
    console.error('❌ Błąd POST proxy punktów odbioru:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  // Obsługa CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Language, x-publishable-api-key');
  return res.status(200).end();
}
