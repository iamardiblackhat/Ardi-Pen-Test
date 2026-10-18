import pg from "pg";
import { poolOptions } from "./src/pool-config.mjs";

// Supabase exposes the public schema through its Data API. Ardi talks to
// Postgres with its own session and never uses the anon key. Enabling row
// level security, with no policies, denies that API. The table owner still
// bypasses it, which is the role in DATABASE_URL.

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL must be set.");
  process.exit(1);
}

const tables = [
  "users",
  "assets",
  "scans",
  "findings",
  "reports",
  "activity",
];

const pool = new pg.Pool({ ...poolOptions(connectionString), max: 1 });
const client = await pool.connect();

try {
  await client.query("begin");
  for (const table of tables) {
    await client.query(
      `alter table if exists public.${table} enable row level security`,
    );
  }
  await client.query(`
    do $$
    begin
      if exists (select 1 from pg_roles where rolname = 'anon') then
        execute 'revoke all on all tables in schema public from anon';
        execute 'revoke all on all sequences in schema public from anon';
      end if;
      if exists (select 1 from pg_roles where rolname = 'authenticated') then
        execute 'revoke all on all tables in schema public from authenticated';
        execute 'revoke all on all sequences in schema public from authenticated';
      end if;
    end
    $$;
  `);
  await client.query("commit");
  console.log("Public tables are closed to the hosted database API.");
} catch (error) {
  await client.query("rollback");
  console.error(error instanceof Error ? error.message : "Lock failed.");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
