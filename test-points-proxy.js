/**
 * Test proxy endpointu dla punktów odbioru Furgonetka
 */

const API_BASE = 'http://localhost:9000/store/furgonetka';

async function testPointsProxy() {
  console.log('🧪 Testowanie proxy punktów odbioru...');
  
  try {
    const testParams = new URLSearchParams({
      city: 'Warszawa',
      courierServices: 'inpost,poczta'
    });
    
    const url = `${API_BASE}/points?${testParams}`;
    console.log('📍 URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'x-publishable-api-key': process.env.MEDUSA_PUBLISHABLE_KEY || '',
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    console.log('📦 Status:', response.status);
    console.log('📄 Response:', data);
    
    if (data.success && data.points) {
      console.log('✅ Sukces! Znaleziono punktów:', data.total);
      console.log('🎯 Pierwsze 3 punkty:', data.points.slice(0, 3));
    } else {
      console.error('❌ Brak punktów w odpowiedzi');
    }
    
  } catch (error) {
    console.error('❌ Błąd testu:', error);
  }
}

// Uruchom test
testPointsProxy();
