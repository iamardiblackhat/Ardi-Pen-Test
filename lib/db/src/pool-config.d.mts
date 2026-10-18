import type { PoolConfig } from "pg";

export function poolOptions(connectionString: string): PoolConfig;

export function drizzleCredentials(connectionString: string):
  | { url: string }
  | {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
      ssl: { ca: string; rejectUnauthorized: true };
    };
