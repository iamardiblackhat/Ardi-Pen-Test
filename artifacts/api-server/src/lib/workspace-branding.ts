import { pool } from "@workspace/db";

export interface WorkspaceBranding {
  brandName: string;
  logoUrl: string;
  accentColor: string;
  contactEmail: string;
  footerText: string;
}

export const DEFAULT_BRANDING: WorkspaceBranding = {
  brandName: "",
  logoUrl: "",
  accentColor: "#16181d",
  contactEmail: "",
  footerText: "",
};

let tableReady: Promise<void> | null = null;

function ensureBrandingTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS workspace_branding (
          user_id INTEGER PRIMARY KEY,
          brand_name TEXT NOT NULL DEFAULT '',
          logo_url TEXT NOT NULL DEFAULT '',
          accent_color TEXT NOT NULL DEFAULT '#16181d',
          contact_email TEXT NOT NULL DEFAULT '',
          footer_text TEXT NOT NULL DEFAULT '',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
      )
      .then(() => undefined)
      .catch(() => {
        tableReady = null;
      });
  }
  return tableReady;
}

export async function getWorkspaceBranding(userId: number): Promise<WorkspaceBranding> {
  try {
    await ensureBrandingTable();
    const res = await pool.query(
      `SELECT brand_name, logo_url, accent_color, contact_email, footer_text
       FROM workspace_branding
       WHERE user_id = $1`,
      [userId],
    );
    const row = res.rows[0];
    if (!row) return { ...DEFAULT_BRANDING };
    return {
      brandName: String(row.brand_name ?? ""),
      logoUrl: String(row.logo_url ?? ""),
      accentColor: String(row.accent_color ?? "#16181d") || "#16181d",
      contactEmail: String(row.contact_email ?? ""),
      footerText: String(row.footer_text ?? ""),
    };
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

export async function upsertWorkspaceBranding(
  userId: number,
  input: WorkspaceBranding,
): Promise<WorkspaceBranding> {
  await ensureBrandingTable();
  await pool.query(
    `INSERT INTO workspace_branding (user_id, brand_name, logo_url, accent_color, contact_email, footer_text, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       brand_name = EXCLUDED.brand_name,
       logo_url = EXCLUDED.logo_url,
       accent_color = EXCLUDED.accent_color,
       contact_email = EXCLUDED.contact_email,
       footer_text = EXCLUDED.footer_text,
       updated_at = NOW()`,
    [
      userId,
      input.brandName,
      input.logoUrl,
      input.accentColor,
      input.contactEmail,
      input.footerText,
    ],
  );
  return input;
}
