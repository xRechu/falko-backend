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
  'REDIS_URL',
  'MEDUSA_BACKEND_URL'
  ]
  const missing = required.filter(k => !process.env[k])
  if (missing.length) {
    // Rzucamy błąd zanim Medusa zainicjuje moduły – prostszy troubleshooting
    throw new Error('Missing required env vars: ' + missing.join(', '))
  }
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
    // Pass SSL options to MikroORM/pg so TLS verification works with Supabase
    databaseDriverOptions: {
      connection: {
        ssl: (() => {
          const reject = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true
          const caPath = process.env.PGSSLROOTCERT || process.env.NODE_EXTRA_CA_CERTS
          if (reject && caPath && fs.existsSync(caPath)) {
            return { rejectUnauthorized: true, ca: fs.readFileSync(caPath, 'utf8') }
          }
          return { rejectUnauthorized: reject }
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
