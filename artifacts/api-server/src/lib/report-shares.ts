import crypto from "node:crypto";
import { pool } from "@workspace/db";

export interface ReportShareRecord {
  token: string;
  reportId: number;
  userId: number;
  expiresAt: string;
  createdAt: string;
}

let tableReady: Promise<void> | null = null;

function ensureSharesTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS report_shares (
          token TEXT PRIMARY KEY,
          report_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
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

export async function createOrGetReportShare(
  userId: number,
  reportId: number,
  daysValid = 14,
): Promise<ReportShareRecord> {
  await ensureSharesTable();

  const existing = await pool.query(
    `SELECT token, report_id, user_id, expires_at, created_at
     FROM report_shares
     WHERE report_id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [reportId, userId],
  );
  if (existing.rows[0]) {
    const r = existing.rows[0];
    return {
      token: String(r.token),
      reportId: Number(r.report_id),
      userId: Number(r.user_id),
      expiresAt: new Date(r.expires_at).toISOString(),
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + daysValid * 86_400_000);

  await pool.query(
    `INSERT INTO report_shares (token, report_id, user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [token, reportId, userId, expiresAt],
  );

  return {
    token,
    reportId,
    userId,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export async function lookupActiveReportShare(token: string): Promise<ReportShareRecord | null> {
  await ensureSharesTable();
  const res = await pool.query(
    `SELECT token, report_id, user_id, expires_at, created_at
     FROM report_shares
     WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [token],
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    token: String(r.token),
    reportId: Number(r.report_id),
    userId: Number(r.user_id),
    expiresAt: new Date(r.expires_at).toISOString(),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function revokeReportShares(userId: number, reportId: number): Promise<number> {
  await ensureSharesTable();
  const res = await pool.query(
    `UPDATE report_shares
     SET revoked_at = NOW()
     WHERE report_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [reportId, userId],
  );
  return res.rowCount ?? 0;
}
