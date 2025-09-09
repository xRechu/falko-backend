import { Client } from "pg"

async function run() {
  const conn = process.env.DATABASE_URL
  if (!conn) {
    console.error("DATABASE_URL not set")
    process.exit(1)
  }
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    console.log("Checking required Postgres extensions (pgcrypto, uuid-ossp)...")
    const { rows } = await client.query(
      "select extname from pg_extension where extname in ('pgcrypto','uuid-ossp') order by extname"
    )
    const installed = rows.map((r: any) => r.extname)
    console.log("Installed:", installed.length ? installed.join(", ") : "(none)")
    const missing = ["pgcrypto"].filter((x) => !installed.includes(x))
    if (missing.length) {
      console.warn(
        `Missing extensions: ${missing.join(", ")} — run in Supabase SQL Editor: CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
      )
      process.exitCode = 2
    } else {
      console.log("All required extensions present ✅")
    }
  } finally {
    await client.end()
  }
}

export default async function () {
  await run()
}
