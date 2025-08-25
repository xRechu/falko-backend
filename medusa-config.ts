import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "328ad21c0d3478c466547337a27d9485b8df879e77f17161ca3c0860b3ca0a2c",
      cookieSecret: process.env.COOKIE_SECRET || "c536e730a781e20e264871a3904b6f2255655f2c4498707466e3bf4014e3f57c",
    }
  },
  admin: {
    disable: false,
    path: "/app",
  }
})
