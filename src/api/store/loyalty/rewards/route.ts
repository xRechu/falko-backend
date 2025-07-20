import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// CORS Middleware
function setCorsHeaders(res: MedusaResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-publishable-api-key, customer-id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * OPTIONS /store/loyalty/rewards
 * Handle preflight requests
 */
export async function OPTIONS(
  req: MedusaRequest,
  res: MedusaResponse
) {
  setCorsHeaders(res);
  return res.status(200).end();
}

/**
 * GET /store/loyalty/rewards
 * Pobierz dostępne nagrody lojalnościowe
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Set CORS headers
    setCorsHeaders(res);
    
    // Mock rewards data - later we'll query the database
    const rewards = [
      {
        id: '1',
        title: '50 PLN Zniżka',
        description: 'Zniżka 50 PLN na następne zakupy',
        points_cost: 500,
        category: 'discount',
        discount_amount: 50,
        image: '/loyalty/discount-50.jpg',
        is_active: true
      },
      {
        id: '2',
        title: 'Darmowa dostawa',
        description: 'Bezpłatna dostawa na następne zamówienie',
        points_cost: 300,
        category: 'shipping',
        image: '/loyalty/free-shipping.jpg',
        is_active: true
      },
      {
        id: '3',
        title: 'Exclusive T-shirt',
        description: 'Limitowany t-shirt dostępny tylko za punkty',
        points_cost: 1500,
        category: 'product',
        product_id: 'exclusive-tshirt-001',
        image: '/loyalty/exclusive-tshirt.jpg',
        is_active: true
      },
      {
        id: '4',
        title: '15% Zniżka Premium',
        description: '15% zniżki na produkty premium',
        points_cost: 1000,
        category: 'discount',
        discount_percentage: 15,
        image: '/loyalty/discount-15.jpg',
        is_active: true
      },
      {
        id: '5',
        title: 'Early Access',
        description: 'Wcześniejszy dostęp do nowych kolekcji',
        points_cost: 3000,
        category: 'exclusive',
        valid_until: '2025-12-31',
        image: '/loyalty/early-access.jpg',
        is_active: true
      },
      {
        id: '6',
        title: '20% Zniżka',
        description: '20% zniżki na cały asortyment',
        points_cost: 2000,
        category: 'discount',
        discount_percentage: 20,
        image: '/loyalty/discount-20.jpg',
        is_active: true
      }
    ]

    console.log('✅ Loyalty rewards fetched successfully')

    return res.status(200).json({ rewards })
    
  } catch (error) {
    console.error('❌ Error fetching loyalty rewards:', error)
    
    return res.status(500).json({
      type: "internal_server_error",
      message: "Failed to fetch loyalty rewards"
    })
  }
}
