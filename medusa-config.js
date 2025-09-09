const { loadEnv, defineConfig } = require('@medusajs/framework/utils')
const fs = require('fs')

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Fail-fast walidacja wymaganych zmiennych w produkcji
if (process.env.NODE_ENV === 'production') {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'COOKIE_SECRET',
    'STORE_CORS',
    'ADMIN_CORS',
    'AUTH_CORS',
    'REDIS_URL'
    // MEDUSA_BACKEND_URL – zalecane, ale jeżeli brak spróbujemy zbudować fallback
  ]
  const missing = required.filter(k => !process.env[k])
  if (missing.length) {
    throw new Error('Missing required env vars: ' + missing.join(', '))
  }
  // Fallback backend URL jeśli nie ustawiono (Railway / Fly detections)
  if (!process.env.MEDUSA_BACKEND_URL) {
    const fallback = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL
    if (fallback) {
      process.env.MEDUSA_BACKEND_URL = /^https?:\/\//.test(fallback) ? fallback : `https://${fallback}`
      console.log('[config] Derived MEDUSA_BACKEND_URL =', process.env.MEDUSA_BACKEND_URL)
    } else {
      console.warn('[config] MEDUSA_BACKEND_URL not set and no fallback domain detected.')
    }
  }
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    // Uproszczona logika SSL: domyślnie korzystaj z wbudowanych CA; opcjonalnie inline CA
    databaseDriverOptions: {
      connection: {
        ssl: (() => {
          // Domyślnie nie wymuszamy rejectUnauthorized (Supabase ma public CA). Ustaw TRUE tylko jeśli jawnie podasz DB_SSL_REJECT_UNAUTHORIZED=true
          const explicit = process.env.DB_SSL_REJECT_UNAUTHORIZED
          const reject = explicit ? explicit !== 'false' : false
          // Opcjonalne przekazanie CA jako ścieżka albo bezpośrednia zawartość (SUPABASE_DB_CA_CERT / SUPABASE_DB_CA_CERT_B64)
          let caContent = null
          const caPath = process.env.PGSSLROOTCERT || process.env.NODE_EXTRA_CA_CERTS
          if (caPath && fs.existsSync(caPath)) {
            try { caContent = fs.readFileSync(caPath, 'utf8') } catch (e) { console.warn('[config][ssl] Failed reading CA file', e.message) }
          } else if (process.env.SUPABASE_DB_CA_CERT) {
            caContent = process.env.SUPABASE_DB_CA_CERT
          } else if (process.env.SUPABASE_DB_CA_CERT_B64) {
            try { caContent = Buffer.from(process.env.SUPABASE_DB_CA_CERT_B64, 'base64').toString('utf8') } catch (e) { console.warn('[config][ssl] Failed decoding base64 CA', e.message) }
          }
          if (caContent) {
            return { rejectUnauthorized: true, ca: caContent }
          }
            return reject ? { rejectUnauthorized: true } : { rejectUnauthorized: false }
        })()
      }
    },
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      // No hardcoded fallbacks; must be provided via environment
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  admin: {
  // Włączony admin (statyczny panel) serwowany spod /app
  // Explicit outDir to match where `medusa build` outputs the client bundle
  disable: false,
  path: "/app",
  backendUrl: process.env.MEDUSA_BACKEND_URL,
  outDir: ".medusa/client",
  }
})

// Diagnostyka runtime (po eksporcie configu)
;(function diagnostics(){
  try {
    const fs = require('fs')
    const p = '.medusa/client/index.html'
    if (fs.existsSync(p)) {
      console.log('[diagnostics] admin index.html found at', p)
    } else {
      console.error('[diagnostics] no admin index.html detected at .medusa/client/index.html')
    }
    if (process.env.REDIS_URL) {
      console.log('[diagnostics] REDIS_URL detected (length)', process.env.REDIS_URL.length)
    } else {
      console.warn('[diagnostics] REDIS_URL not set at process start')
    }
  } catch (e) {
    console.warn('[diagnostics] failed', e.message)
  }
})()
