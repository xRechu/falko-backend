/**
 * Proxy endpoint dla Furgonetka Map API - /points/map/clusters
 * Obsługuje żądania klastrów punktów z Map widget
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { furgonetkaOAuth } from "../../../../../../services/furgonetka-oauth";

// Middleware do pomijania wymagania API key dla tego endpointu
export const AUTHENTICATE = false;

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log('🗺️ Furgonetka Map API proxy - /points/map/clusters');
    console.log('🔗 Query params:', req.query);
    
    // Ustaw CORS headers najpierw
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Language, x-publishable-api-key');
    
    // Przekaż query params do Furgonetka API
    const queryString = new URLSearchParams(req.query as any).toString();
    
    console.log('📡 Query string:', queryString);
    
    // Zwróć pusty clusters response zgodny z oczekiwaniami Map API
    // (na razie bez OAuth, żeby przetestować strukturę)
    return res.status(200).json({
      clusters: [
        // Przykładowy cluster dla Warszawy
        {
          id: "cluster_1",
          lat: 52.2297,
          lng: 21.0122,
          count: 5,
          bounds: {
            north: 52.25,
            south: 52.20,
            east: 21.05,
            west: 20.98
          }
        }
      ],
      bounds: {
        north: 52.25,
        south: 52.20,
        east: 21.05,
        west: 20.98
      },
      total_count: 5
    });
    
  } catch (error) {
    console.error('❌ Błąd GET proxy clusters:', error);
    return res.status(500).json({
      clusters: [],
      bounds: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log('🗺️ Furgonetka Map API proxy - POST /points/map/clusters');
    
    // Używaj rawBody jeśli jest dostępne, albo req.body jako fallback
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
    console.log('🔗 Headers:', JSON.stringify(req.headers, null, 2));
    
    // Przekaż żądanie bezpośrednio do Furgonetka API z autentykacją OAuth
    const response = await furgonetkaOAuth.authenticatedRequest('/points/map/clusters', {
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
    console.log('✅ Furgonetka API response:', data);
    
    // Ustaw odpowiednie nagłówki CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Language, x-publishable-api-key');
    
    // Zwróć odpowiedź z Furgonetka API
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Błąd POST proxy clusters:', error);
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
