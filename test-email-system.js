/**
 * Test Email System - Sprawdza czy wszystkie emaile działają
 * Uruchom: node test-email-system.js
 */

const { emailService } = require('./src/services/email.ts');

async function testEmailSystem() {
  console.log('🧪 Testing Email System...\n');

  // Test 1: Welcome Email
  console.log('📧 Test 1: Welcome Email');
  try {
    const welcomeData = {
      customerName: 'Jan Kowalski',
      customerEmail: 'test@example.com',
      loginUrl: 'http://localhost:3000/login'
    };
    
    const result = await emailService.sendWelcomeEmail('test@example.com', welcomeData);
    console.log('✅ Welcome email test:', result.success ? 'PASSED' : 'FAILED');
    if (!result.success) console.log('   Error:', result.error);
  } catch (error) {
    console.log('❌ Welcome email test: FAILED');
    console.log('   Error:', error.message);
  }

  console.log('');

  // Test 2: Order Confirmation Email
  console.log('📧 Test 2: Order Confirmation Email');
  try {
    const orderData = {
      customerName: 'Jan Kowalski',
      orderNumber: 'ORD-001',
      orderTotal: '299.99 PLN',
      orderItems: [
        { title: 'Bluza Falko Classic', quantity: 1, price: '199.99 PLN' },
        { title: 'Czapka Falko Logo', quantity: 1, price: '99.99 PLN' }
      ],
      shippingAddress: 'ul. Testowa 123\n00-001 Warszawa'
    };
    
    const result = await emailService.sendOrderConfirmation('test@example.com', orderData);
    console.log('✅ Order confirmation test:', result.success ? 'PASSED' : 'FAILED');
    if (!result.success) console.log('   Error:', result.error);
  } catch (error) {
    console.log('❌ Order confirmation test: FAILED');
    console.log('   Error:', error.message);
  }

  console.log('');

  // Test 3: Password Reset Email
  console.log('📧 Test 3: Password Reset Email');
  try {
    const resetData = {
      customerName: 'Jan Kowalski',
      resetUrl: 'http://localhost:3000/reset-password?token=test123',
      expiresIn: '1 godzina'
    };
    
    const result = await emailService.sendPasswordReset('test@example.com', resetData);
    console.log('✅ Password reset test:', result.success ? 'PASSED' : 'FAILED');
    if (!result.success) console.log('   Error:', result.error);
  } catch (error) {
    console.log('❌ Password reset test: FAILED');
    console.log('   Error:', error.message);
  }

  console.log('');

  // Test 4: Configuration Check
  console.log('⚙️ Test 4: Configuration Check');
  const hasApiKey = !!process.env.RESEND_API_KEY;
  const hasFromEmail = !!process.env.EMAIL_FROM;
  
  console.log('✅ RESEND_API_KEY:', hasApiKey ? 'CONFIGURED' : '❌ MISSING');
  console.log('✅ EMAIL_FROM:', hasFromEmail ? 'CONFIGURED' : '❌ MISSING');
  
  if (!hasApiKey) {
    console.log('   ⚠️ Add RESEND_API_KEY to your .env file');
  }
  if (!hasFromEmail) {
    console.log('   ⚠️ Add EMAIL_FROM to your .env file');
  }

  console.log('');
  console.log('🎉 Email system test completed!');
  
  if (!hasApiKey) {
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Sign up at https://resend.com');
    console.log('2. Get your API key');
    console.log('3. Add RESEND_API_KEY=re_xxxxxxxxxx to .env');
    console.log('4. Run this test again');
  }
}

// Run tests
testEmailSystem().catch(console.error);