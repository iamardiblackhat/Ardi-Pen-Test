import { SUPABASE_ROOT_CA } from "./supabase-ca.mjs";

function isLocalDatabase(connectionString) {
  return (
    connectionString.includes("host=/") ||
    /(^|@)(localhost|127\.0\.0\.1)([:/?]|$)/.test(connectionString)
  );
}

function usesSupabaseCa(connectionString) {
  let hostname = "";
  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    return false;
  }
  return (
    hostname === "pooler.supabase.com" ||
    hostname.endsWith(".pooler.supabase.com") ||
    hostname.endsWith(".supabase.co") ||
    hostname.endsWith(".supabase.com")
  );
}

// pg 8 treats sslmode=require as verify-full and lets the query string
// replace an ssl object. Drop sslmode and pass the Supabase root CA so the
// pooler chain verifies without turning verification off.
function connectionForSsl(connectionString) {
  if (!usesSupabaseCa(connectionString)) {
    return { connectionString };
  }
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return {
    connectionString: url.toString(),
    ssl: {
      ca: SUPABASE_ROOT_CA,
      rejectUnauthorized: true,
    },
  };
}

export function poolOptions(connectionString) {
  const requestedMax = Number(
    process.env.DATABASE_POOL_MAX ?? (isLocalDatabase(connectionString) ? "10" : "3"),
  );
  const max = Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : 3;
  return {
    ...connectionForSsl(connectionString),
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  };
}

export function drizzleCredentials(connectionString) {
  if (!usesSupabaseCa(connectionString)) {
    return { url: connectionString };
  }
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres";
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl: {
      ca: SUPABASE_ROOT_CA,
      rejectUnauthorized: true,
    },
  };
}
