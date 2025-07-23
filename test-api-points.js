/**
 * Test prostszego API endpointu dla punktów odbioru Furgonetka
 */

const API_BASE = 'http://localhost:9000/api/furgonetka';

async function testPointsAPI() {
  console.log('🧪 Testowanie API punktów odbioru...');
  
  try {
    const testParams = new URLSearchParams({
      city: 'Warszawa',
      courierServices: 'inpost,poczta'
    });
    
    const url = `${API_BASE}/points?${testParams}`;
    console.log('📍 URL:', url);
    
    const response = await fetch(url);
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
    console.error('💥 Błąd:', error);
  }
}

// Uruchom test
testPointsAPI();
