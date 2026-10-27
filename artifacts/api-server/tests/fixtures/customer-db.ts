import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { SQL, is } from "drizzle-orm";
import * as schema from "../../../../lib/db/src/schema";
export * from "../../../../lib/db/src/schema";
export const client = new PGlite();
export const db = drizzle(client, { schema });
export async function initializeFixtureDatabase() {
  const dialect = new PgDialect();
  for (const table of Object.values(schema)) {
    if (!table || typeof table !== "object" || !("getSQL" in table)) continue;
    const config = getTableConfig(
      table as Parameters<typeof getTableConfig>[0],
    );
    const columns = config.columns.map((c) => {
      let ddl = `"${c.name}" ${c.getSQLType()}`;
      if (c.primary) ddl += " PRIMARY KEY";
      if (c.notNull) ddl += " NOT NULL";
      if (c.isUnique) ddl += " UNIQUE";
      if (c.default !== undefined) {
        const d = c.default;
        const value = is(d, SQL)
          ? dialect.sqlToQuery(d).sql
          : Array.isArray(d)
            ? "ARRAY[]::text[]"
            : typeof d === "string"
              ? `'${d.replaceAll("'", "''")}'`
              : String(d);
        ddl += ` DEFAULT ${value}`;
      }
      return ddl;
    });
    await client.exec(`CREATE TABLE "${config.name}" (${columns.join(",")})`);
  }
}
