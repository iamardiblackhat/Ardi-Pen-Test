import { defineConfig } from "drizzle-kit";
import path from "path";
import { drizzleCredentials } from "./src/pool-config.mjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: drizzleCredentials(process.env.DATABASE_URL),
});
