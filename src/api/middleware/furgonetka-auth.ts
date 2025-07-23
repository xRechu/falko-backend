/**
 * Middleware autoryzacji dla Furgonetka.pl webhooks
 * Bezpieczna implementacja z logowaniem
 */

import { Request, Response, NextFunction } from 'express';

// Token autoryzacyjny - w produkcji z zmiennych środowiskowych
const FURGONETKA_AUTH_TOKEN = process.env.FURGONETKA_AUTH_TOKEN;

// Prosta implementacja rate limiting (w produkcji użyj Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function simpleRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minut
  const maxRequests = 100;

  const current = requestCounts.get(ip);
  
  if (!current || now > current.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  current.count++;
  next();
}

// Middleware autoryzacji
export function authenticateFurgonetka(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    // Sprawdź obecność header Authorization
    if (!authHeader) {
      console.warn('🚨 Furgonetka API: Brak Authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ error: 'Authorization header required' });
    }

    // Sprawdź format Bearer token
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    // Walidacja tokenu
    if (!FURGONETKA_AUTH_TOKEN || token !== FURGONETKA_AUTH_TOKEN) {
      console.warn('🚨 Furgonetka API: Nieprawidłowy token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        token: token.substring(0, 8) + '...', // Tylko pierwsze 8 znaków dla logów
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ error: 'Invalid authorization token' });
    }

    // Log udanej autoryzacji
    console.log('✅ Furgonetka API: Autoryzacja udana', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    console.error('❌ Furgonetka API: Błąd autoryzacji', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware do logowania wszystkich wywołań Furgonetka
export function logFurgonetkaRequest(req: Request, res: Response, next: NextFunction) {
  console.log('📡 Furgonetka API Request:', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.method === 'POST' ? req.body : undefined,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  next();
}

export default {
  authenticateFurgonetka,
  logFurgonetkaRequest,
  furgonetkaRateLimit: simpleRateLimit
};
