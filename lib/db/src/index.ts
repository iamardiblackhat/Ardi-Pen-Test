import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { poolOptions } from "./pool-config.mjs";
import * as schema from "./schema";

const { Pool } = pg;

// DATABASE_URL is the app's own setting. POSTGRES_URL_NON_POOLING is the
// session-mode URL Supabase injects (port 5432). The transaction URL on
// port 6543 is intentionally not a fallback: it breaks prepared statements.
const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// A local socket or loopback server can take more connections. Free hosted
// Postgres (Supabase Nano) cannot: a small app-side pool keeps the session
// pooler from filling up. Supabase hosts also get the project root CA so
// TLS verification stays on.
export const pool = new Pool(poolOptions(connectionString));
export const db = drizzle(pool, { schema });

export * from "./schema";
