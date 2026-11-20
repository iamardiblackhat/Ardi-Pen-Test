import crypto from "node:crypto";
import { db, pool, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { TokenPayload } from "./auth";

export interface ApiKeySummary {
  id: number;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

let tableReady: Promise<void> | null = null;

function ensureApiKeysTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS workspace_api_keys (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          key_prefix TEXT NOT NULL,
          key_hash TEXT NOT NULL UNIQUE,
          last_used_at TIMESTAMPTZ,
          revoked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
      )
      .then(() => undefined)
      .catch(() => {
        tableReady = null;
      });
  }
  return tableReady;
}

function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function listWorkspaceApiKeys(userId: number): Promise<ApiKeySummary[]> {
  try {
    await ensureApiKeysTable();
    const res = await pool.query(
      `SELECT id, name, key_prefix, last_used_at, created_at
       FROM workspace_api_keys
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [userId],
    );
    return res.rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      keyPrefix: String(r.key_prefix),
      lastUsedAt: r.last_used_at ? new Date(r.last_used_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function createWorkspaceApiKey(
  userId: number,
  name: string,
): Promise<{ key: ApiKeySummary; plaintextKey: string }> {
  await ensureApiKeysTable();
  const plaintextKey = `ardi_${crypto.randomBytes(24).toString("base64url")}`;
  const keyPrefix = `${plaintextKey.slice(0, 12)}...`;
  const keyHash = hashApiKey(plaintextKey);

  const res = await pool.query(
    `INSERT INTO workspace_api_keys (user_id, name, key_prefix, key_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, key_prefix, last_used_at, created_at`,
    [userId, name, keyPrefix, keyHash],
  );
  const r = res.rows[0];
  return {
    key: {
      id: Number(r.id),
      name: String(r.name),
      keyPrefix: String(r.key_prefix),
      lastUsedAt: null,
      createdAt: new Date(r.created_at).toISOString(),
    },
    plaintextKey,
  };
}

export async function revokeWorkspaceApiKey(userId: number, keyId: number): Promise<boolean> {
  await ensureApiKeysTable();
  const res = await pool.query(
    `UPDATE workspace_api_keys
     SET revoked_at = NOW()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [keyId, userId],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function verifyWorkspaceApiKey(rawKey: string): Promise<TokenPayload | null> {
  if (!rawKey.startsWith("ardi_") || rawKey.length < 20) return null;
  try {
    await ensureApiKeysTable();
    const keyHash = hashApiKey(rawKey);
    const res = await pool.query(
      `SELECT id, user_id
       FROM workspace_api_keys
       WHERE key_hash = $1 AND revoked_at IS NULL
       LIMIT 1`,
      [keyHash],
    );
    const row = res.rows[0];
    if (!row) return null;

    const userId = Number(row.user_id);
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user) return null;

    void pool
      .query(`UPDATE workspace_api_keys SET last_used_at = NOW() WHERE id = $1`, [row.id])
      .catch(() => {});

    const now = Math.floor(Date.now() / 1000);
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + 3600,
    };
  } catch {
    return null;
  }
}
