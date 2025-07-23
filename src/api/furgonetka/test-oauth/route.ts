/**
 * Test endpoint dla OAuth integration z Furgonetka.pl
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { furgonetkaOAuth } from "../../../services/furgonetka-oauth";

/**
 * GET /furgonetka/test-oauth
 * Testuje OAuth połączenie z Furgonetka.pl
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  console.log("🧪 Furgonetka OAuth Test: Rozpoczęcie testów...");
  
  try {
    const results = {
      timestamp: new Date().toISOString(),
      tests: [] as any[],
      overall: 'unknown' as 'success' | 'partial' | 'failed'
    };

    // Test 1: Sprawdzenie konfiguracji
    const hasClientId = !!process.env.FURGONETKA_OAUTH_CLIENT_ID;
    const hasClientSecret = !!process.env.FURGONETKA_OAUTH_CLIENT_SECRET;
    
    results.tests.push({
      name: 'OAuth Configuration',
      status: hasClientId && hasClientSecret ? 'success' : 'failed',
      details: {
        client_id: hasClientId ? 'configured' : 'missing',
        client_secret: hasClientSecret ? 'configured' : 'missing',
        base_url: process.env.FURGONETKA_BASE_URL || 'default'
      }
    });

    if (!hasClientId || !hasClientSecret) {
      console.warn('🚨 OAuth konfiguracja niepełna');
      results.overall = 'failed';
      return res.status(200).json(results);
    }

    // Test 2: Próba pobrania tokenu
    try {
      console.log('🔄 Testowanie pobrania tokenu...');
      const token = await furgonetkaOAuth.getAccessToken();
      
      results.tests.push({
        name: 'Access Token',
        status: 'success',
        details: {
          token_preview: token.substring(0, 20) + '...',
          length: token.length
        }
      });
    } catch (tokenError) {
      console.error('❌ Błąd pobrania tokenu:', tokenError);
      results.tests.push({
        name: 'Access Token',
        status: 'failed',
        error: tokenError.message
      });
      results.overall = 'failed';
      return res.status(200).json(results);
    }

    // Test 3: Test połączenia z API
    try {
      console.log('📡 Testowanie API connection...');
      const isConnected = await furgonetkaOAuth.testConnection();
      
      results.tests.push({
        name: 'API Connection',
        status: isConnected ? 'success' : 'failed'
      });
      
      if (!isConnected) {
        results.overall = 'partial';
      }
    } catch (apiError) {
      console.error('❌ Błąd testowania API:', apiError);
      results.tests.push({
        name: 'API Connection',
        status: 'failed',
        error: apiError.message
      });
      results.overall = 'partial';
    }

    // Test 4: Pobranie dostępnych usług (jeśli API działa)
    try {
      console.log('📋 Testowanie pobrania usług...');
      const services = await furgonetkaOAuth.getAvailableServices();
      
      results.tests.push({
        name: 'Available Services',
        status: 'success',
        details: {
          services_count: services?.length || 0,
          sample_services: services?.slice(0, 3)?.map((s: any) => s.name) || []
        }
      });
    } catch (servicesError) {
      console.error('❌ Błąd pobierania usług:', servicesError);
      results.tests.push({
        name: 'Available Services',
        status: 'failed',
        error: servicesError.message
      });
    }

    // Ustaw ogólny status
    const failedTests = results.tests.filter(t => t.status === 'failed').length;
    if (failedTests === 0) {
      results.overall = 'success';
    } else if (failedTests < results.tests.length) {
      results.overall = 'partial';
    } else {
      results.overall = 'failed';
    }

    console.log(`✅ Furgonetka OAuth Test zakończony: ${results.overall}`);
    
    return res.status(200).json(results);
    
  } catch (error) {
    console.error("❌ Furgonetka OAuth Test: Nieoczekiwany błąd", error);
    
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      overall: 'failed',
      error: error.message,
      tests: []
    });
  }
}
