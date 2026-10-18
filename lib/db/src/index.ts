import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { poolOptions } from "./pool-config.mjs";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

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
