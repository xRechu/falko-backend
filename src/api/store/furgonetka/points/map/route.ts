/**
 * Proxy endpoint dla Furgonetka Map API - /points/map
 * Obsługuje żądania punktów odbioru w kontekście mapy
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { furgonetkaOAuth } from "../../../../../services/furgonetka-oauth";

// Middleware do pomijania wymagania API key dla tego endpointu
export const AUTHENTICATE = false;

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log('🗺️ GET /points/map - Proxy dla Furgonetka Map API');
    console.log('🔗 Query params:', req.query);
    
    // Ustaw CORS headers najpierw
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Language, x-publishable-api-key');
    
    // Przekaż query params do Furgonetka API
    const queryString = new URLSearchParams(req.query as any).toString();
    console.log('📡 Query string:', queryString);
    
    // Zwróć mockowe dane punktów na mapie zgodne z Map API
    return res.status(200).json({
      success: true,
      points: [
        {
          code: "WAW198M",
          name: "InPost Paczkomat WAW198M",
          coordinates: {
            latitude: 52.2293,
            longitude: 21.0139
          },
          address: {
            postcode: "00-510",
            street: "Marszałkowska 94",
            city: "Warszawa",
            country_code: "PL"
          },
          type: "PACZKOMAT",
          service: "inpost",
          active: true,
          cod: true,
          opening_hours: {
            monday: { start_hour: "00:00", end_hour: "23:59" },
            tuesday: { start_hour: "00:00", end_hour: "23:59" },
            wednesday: { start_hour: "00:00", end_hour: "23:59" },
            thursday: { start_hour: "00:00", end_hour: "23:59" },
            friday: { start_hour: "00:00", end_hour: "23:59" },
            saturday: { start_hour: "00:00", end_hour: "23:59" },
            sunday: { start_hour: "00:00", end_hour: "23:59" }
          }
        },
        {
          code: "WAW201M",
          name: "InPost Paczkomat WAW201M",
          coordinates: {
            latitude: 52.22885,
            longitude: 21.01413
          },
          address: {
            postcode: "00-511",
            street: "Nowogrodzka 27",
            city: "Warszawa",
            country_code: "PL"
          },
          type: "PACZKOMAT",
          service: "inpost",
          active: true,
          cod: true,
          opening_hours: {
            monday: { start_hour: "00:00", end_hour: "23:59" },
            tuesday: { start_hour: "00:00", end_hour: "23:59" },
            wednesday: { start_hour: "00:00", end_hour: "23:59" },
            thursday: { start_hour: "00:00", end_hour: "23:59" },
            friday: { start_hour: "00:00", end_hour: "23:59" },
            saturday: { start_hour: "00:00", end_hour: "23:59" },
            sunday: { start_hour: "00:00", end_hour: "23:59" }
          }
        }
      ],
      total: 2,
      message: "Mock data - map endpoints working"
    });

  } catch (error) {
    console.error('❌ Błąd GET /points/map:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log('🗺️ POST /points/map - Furgonetka Map API');
    
    // Ustaw CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Language, x-publishable-api-key');
    
    // Użyj rawBody jeśli jest dostępne, albo req.body jako fallback
    let bodyData;
    if (req.rawBody) {
      try {
        bodyData = JSON.parse(req.rawBody.toString());
      } catch (e) {
        bodyData = req.body || {};
      }
    } else {
      bodyData = req.body || {};
    }
    
    console.log('📦 Request body:', JSON.stringify(bodyData, null, 2));
    
    // Przekaż żądanie do Furgonetka API z autentykacją OAuth
    const response = await furgonetkaOAuth.authenticatedRequest('/points/map', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.furgonetka.v1+json',
        'Accept': 'application/vnd.furgonetka.v1+json',
        'X-Language': 'pl_PL'
      },
      body: JSON.stringify(bodyData)
    });
    
    if (!response.ok) {
      console.error('❌ Furgonetka API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error details:', errorText);
      
      return res.status(response.status).json({
        success: false,
        error: `Furgonetka API error: ${response.status} - ${errorText}`
      });
    }
    
    const data = await response.json();
    console.log('✅ Furgonetka Map API response:', data);
    
    // Zwróć odpowiedź z Furgonetka API
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Błąd POST /points/map:', error);
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
