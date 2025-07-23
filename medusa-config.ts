import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "02e730d8bd97b2eae4dca643cdb338318f908a06055e8e2ad9f55d08bea7ce30",
      cookieSecret: process.env.COOKIE_SECRET || "ea8dc166b7ff599cc5ee5697cc52c6ae782f3ceff3b5ad9f057a71ac167a0f6f",
    }
  },
  admin: {
    disable: false,
    path: "/app",
  }
})
