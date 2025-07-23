/**
 * Test OAuth integration dla Furgonetka.pl
 * Sprawdza czy aplikacja OAuth jest poprawnie skonfigurowana
 */

const path = require('path');

// Załaduj zmienne środowiskowe
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Test 1: Sprawdź konfigurację
function checkOAuthConfiguration() {
  console.log('\n🔍 Sprawdzanie konfiguracji OAuth...');
  
  const clientId = process.env.FURGONETKA_OAUTH_CLIENT_ID;
  const clientSecret = process.env.FURGONETKA_OAUTH_CLIENT_SECRET;
  const baseUrl = process.env.FURGONETKA_BASE_URL;

  console.log(`CLIENT_ID: ${clientId ? '✅ Ustawione' : '❌ Brak'}`);
  console.log(`CLIENT_SECRET: ${clientSecret ? '✅ Ustawione' : '❌ Brak'}`);
  console.log(`BASE_URL: ${baseUrl || 'Brak (użyje domyślnego)'}`);

  if (!clientId || !clientSecret) {
    console.log('\n🚨 BRAK KONFIGURACJI OAuth!');
    console.log('Musisz dodać do .env:');
    console.log('FURGONETKA_OAUTH_CLIENT_ID=twoj_client_id');
    console.log('FURGONETKA_OAUTH_CLIENT_SECRET=twoj_client_secret');
    return false;
  }

  return true;
}

// Test 2: Testuj OAuth endpoint
async function testOAuthFlow() {
  console.log('\n🧪 Testowanie OAuth flow...');
  
  const clientId = process.env.FURGONETKA_OAUTH_CLIENT_ID;
  const clientSecret = process.env.FURGONETKA_OAUTH_CLIENT_SECRET;
  const baseUrl = process.env.FURGONETKA_BASE_URL || 'https://api.sandbox.furgonetka.pl';

  try {
    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      }).toString()
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ OAuth TOKEN OTRZYMANY!');
      console.log(`   Token type: ${data.token_type}`);
      console.log(`   Expires in: ${data.expires_in} seconds`);
      console.log(`   Scope: ${data.scope || 'brak'}`);
      console.log(`   Access token: ${data.access_token.substring(0, 20)}...`);
      
      return data.access_token;
    } else {
      console.log('❌ OAuth FAILED');
      console.log('Response:', responseText);
      return null;
    }
  } catch (error) {
    console.error('❌ OAuth ERROR:', error.message);
    return null;
  }
}

// Test 3: Testuj autoryzowane zapytanie
async function testAuthorizedRequest(token) {
  if (!token) {
    console.log('\n⏭️  Pomijanie testu autoryzowanego zapytania (brak tokenu)');
    return;
  }

  console.log('\n🔐 Testowanie autoryzowanego zapytania...');
  
  const baseUrl = process.env.FURGONETKA_BASE_URL || 'https://api.sandbox.furgonetka.pl';

  try {
    const response = await fetch(`${baseUrl}/configuration/dictionary`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.furgonetka.v1+json',
        'Accept': 'application/vnd.furgonetka.v1+json',
        'X-Language': 'pl_PL'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    // Sprawdź rate limiting headers
    const rateLimit = response.headers.get('X-RateLimit-Limit');
    const rateRemaining = response.headers.get('X-RateLimit-Remaining');
    
    if (rateLimit) {
      console.log(`📊 Rate Limit: ${rateRemaining}/${rateLimit} remaining`);
    }

    if (response.ok) {
      const data = await response.json();
      console.log('✅ AUTORYZOWANE ZAPYTANIE UDANE!');
      console.log(`   Otrzymano ${Object.keys(data).length} kluczy w dictionary`);
      
      // Pokaż przykładowe dane
      if (data.parcel_sizes) {
        console.log(`   Dostępne rozmiary paczek: ${data.parcel_sizes.length}`);
      }
      if (data.countries) {
        console.log(`   Dostępne kraje: ${data.countries.length}`);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ AUTORYZOWANE ZAPYTANIE FAILED');
      console.log('Response:', errorText);
    }
  } catch (error) {
    console.error('❌ AUTHORIZED REQUEST ERROR:', error.message);
  }
}

// Główny test
async function runOAuthTests() {
  console.log('🚀 FURGONETKA.PL OAuth INTEGRATION TEST');
  console.log('=====================================');

  // Test 1: Konfiguracja
  const isConfigured = checkOAuthConfiguration();
  
  if (!isConfigured) {
    console.log('\n⚠️  Zakończenie testów - brak konfiguracji OAuth');
    return;
  }

  // Test 2: OAuth flow
  const token = await testOAuthFlow();
  
  // Test 3: Autoryzowane zapytanie
  await testAuthorizedRequest(token);

  console.log('\n📋 PODSUMOWANIE:');
  if (token) {
    console.log('✅ OAuth integration działa poprawnie!');
    console.log('🎉 Możesz teraz korzystać z Furgonetka.pl API');
  } else {
    console.log('❌ OAuth integration wymaga poprawek');
    console.log('🔧 Sprawdź Client ID i Client Secret w panelu Furgonetka.pl');
  }
}

// Uruchom testy
runOAuthTests().catch(console.error);
