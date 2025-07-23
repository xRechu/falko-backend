import { defineMiddlewares } from "@medusajs/framework/http"
import type {
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from "@medusajs/framework/http";

/**
 * Middleware do wyłączenia autoryzacji dla webhook'ów Furgonetka.pl
 * Furgonetka używa własnego tokenu Bearer w header Authorization
 */
async function disablePublishableKeyAuth(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  console.log('🔓 Furgonetka webhook: Disabling publishable key auth');
  
  // Dodaj fake publishable key żeby middleware Medusa nie blokował
  if (!req.headers['x-publishable-api-key']) {
    req.headers['x-publishable-api-key'] = 'furgonetka-webhook-bypass';
  }
  
  next();
}

/**
 * CORS middleware dla webhook'ów
 */
async function furgonetkaWebhookCors(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  // Ustaw CORS headers dla webhook'ów zewnętrznych
  res.setHeader('Access-Control-Allow-Origin', '*'); // Furgonetka może mieć różne IP
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key');
  res.setHeader('Access-Control-Allow-Credentials', 'false'); // Webhook'i nie używają credentials
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}

/**
 * Logger dla webhook'ów Furgonetka
 */
async function furgonetkaWebhookLogger(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const timestamp = new Date().toISOString();
  const authHeader = req.headers.authorization;
  
  console.log(`📡 [${timestamp}] Furgonetka Webhook: ${req.method} ${req.path}`);
  console.log(`   Authorization: ${authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : 'none'}`);
  console.log(`   User-Agent: ${req.headers['user-agent'] || 'unknown'}`);
  console.log(`   IP: ${req.ip || req.socket?.remoteAddress || 'unknown'}`);
  
  next();
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/furgonetka/*",
      middlewares: [
        furgonetkaWebhookLogger,
        furgonetkaWebhookCors,
        disablePublishableKeyAuth
      ],
    },
  ],
})
