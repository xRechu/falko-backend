/**
 * Proxy endpoint dla Furgonetka Map API - /points/map
 * Obsługuje żądania punktów odbioru w kontekście mapy
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { furgonetkaOAuth } from "../../../../../services/furgonetka-oauth";

// Middleware do pomijania wymagania API key dla tego endpointu
export const AUTHENTICATE = false;

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Enforce POST-only contract (no mock data)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Language, x-publishable-api-key')
  return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST /store/furgonetka/points/map' })
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
