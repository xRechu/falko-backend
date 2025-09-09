const { loadEnv, defineConfig } = require('@medusajs/framework/utils')

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Minimalna konfiguracja: zakładamy że sam DATABASE_URL (z ?sslmode=require) wystarcza.
// Brak niestandardowej walidacji/wymuszeń SSL.

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    // Wymuszenie nie-weryfikowanego cert chain (Supabase public CA powinno działać;
    // jeśli Railway środowisko nadal rzuca SELF_SIGNED_CERT_IN_CHAIN, to obejście).
    // Ustaw FORCE_DB_SSL_REJECT=true aby włączyć ponownie weryfikację.
    databaseDriverOptions: {
      connection: {
        ssl: (() => {
          if (process.env.FORCE_DB_SSL_REJECT === 'true') {
            return { rejectUnauthorized: true }
          }
          return { rejectUnauthorized: false }
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
  if (process.env.REDIS_URL) console.log('[diagnostics] REDIS_URL ok')
  } catch (e) {
    console.warn('[diagnostics] failed', e.message)
  }
})()
