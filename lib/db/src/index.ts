import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
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
// pooler from filling up. sslmode in the URL is left to node-postgres.
const localDatabase =
  connectionString.includes("host=/") ||
  /(^|@)(localhost|127\.0\.0\.1)([:/?]|$)/.test(connectionString);

const requestedMax = Number(
  process.env.DATABASE_POOL_MAX ?? (localDatabase ? "10" : "3"),
);
const max =
  Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : 3;

export const pool = new Pool({
  connectionString,
  max,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
