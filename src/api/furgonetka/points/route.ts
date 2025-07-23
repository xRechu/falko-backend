/**
 * Proxy endpoint dla pobierania punktów odbioru z Furgonetka API
 * Prostsza wersja bez Medusa store middlewares
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { furgonetkaOAuth } from "../../../services/furgonetka-oauth";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log('🗺️ [API] Pobieranie punktów odbioru:', req.query);
    
    // Pobierz parametry zapytania
    const { 
      city, 
      street, 
      courierServices, 
      type, 
      zoom 
    } = req.query;
    
    // Buduj URL do API punktów
    const apiUrl = new URL('https://api.furgonetka.pl/points/map');
    
    // Dodaj parametry zapytania
    if (city) apiUrl.searchParams.set('city', city as string);
    if (street) apiUrl.searchParams.set('street', street as string);
    if (courierServices) {
      // Może być string lub array
      const services = Array.isArray(courierServices) 
        ? courierServices.join(',')
        : courierServices as string;
      apiUrl.searchParams.set('courierServices', services);
    }
    if (type) apiUrl.searchParams.set('type', type as string);
    if (zoom) apiUrl.searchParams.set('zoom', zoom as string);
    
    console.log('🔗 [API] Zapytanie do Furgonetka:', apiUrl.toString());
    
    // Wykonaj zapytanie z autoryzacją OAuth
    const response = await furgonetkaOAuth.authenticatedRequest(apiUrl.toString(), {
      method: 'GET'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Błąd pobierania punktów:', response.status, errorText);
      return res.status(500).json({
        error: 'Failed to fetch pickup points',
        details: `${response.status}: ${response.statusText}`,
        debug: errorText
      });
    }
    
    const pointsData = await response.json();
    console.log('✅ [API] Pobrano punkty odbioru:', pointsData?.length || 0);
    
    // Zwróć dane z odpowiednimi nagłówkami CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return res.status(200).json({
      success: true,
      points: pointsData,
      total: pointsData?.length || 0
    });
    
  } catch (error) {
    console.error('❌ [API] Błąd proxy punktów odbioru:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  // Obsługa CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(200).end();
}
