/**
 * Test skrypt dla Furgonetka.pl API endpoints
 */

const BASE_URL = 'http://localhost:9000';
const AUTH_TOKEN = 'furgonetka_eab29026b27ea3015b3d1d35fe4b8964ba02345483ecdfec6fe9f46cfb8266d2';

async function testFurgonetkaEndpoints() {
  console.log('🧪 Testowanie endpointów Furgonetka.pl...\n');

  // Test 1: GET /furgonetka/orders
  try {
    console.log('1️⃣ Testowanie GET /furgonetka/orders');
    const response = await fetch(`${BASE_URL}/furgonetka/orders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
    console.log('   ✅ Test GET /furgonetka/orders zakończony\n');
  } catch (error) {
    console.error('   ❌ Błąd:', error);
  }

  // Test 2: POST /furgonetka/orders/test-order/tracking_number
  try {
    console.log('2️⃣ Testowanie POST /furgonetka/orders/test-order/tracking_number');
    const response = await fetch(`${BASE_URL}/furgonetka/orders/test-order/tracking_number`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tracking: {
          number: 'TEST123456789',
          courierService: 'dpd'
        }
      })
    });

    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
    console.log('   ✅ Test POST tracking_number zakończony\n');
  } catch (error) {
    console.error('   ❌ Błąd:', error);
  }

  // Test 3: Test bez autoryzacji
  try {
    console.log('3️⃣ Testowanie bez autoryzacji (powinno zwrócić 401)');
    const response = await fetch(`${BASE_URL}/furgonetka/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response:`, data);
    console.log('   ✅ Test autoryzacji zakończony\n');
  } catch (error) {
    console.error('   ❌ Błąd:', error);
  }
}

testFurgonetkaEndpoints();
