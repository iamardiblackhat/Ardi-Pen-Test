import { pool } from "@workspace/db";

export interface WorkspaceWebhookConfig {
  webhookUrl: string;
  enabled: boolean;
  notifyOnMonitoring: boolean;
  notifyOnHighFindings: boolean;
}

export const DEFAULT_WEBHOOK_CONFIG: WorkspaceWebhookConfig = {
  webhookUrl: "",
  enabled: false,
  notifyOnMonitoring: true,
  notifyOnHighFindings: true,
};

let tableReady: Promise<void> | null = null;

function ensureWebhooksTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS workspace_webhooks (
          user_id INTEGER PRIMARY KEY,
          webhook_url TEXT NOT NULL DEFAULT '',
          enabled BOOLEAN NOT NULL DEFAULT FALSE,
          notify_on_monitoring BOOLEAN NOT NULL DEFAULT TRUE,
          notify_on_high_findings BOOLEAN NOT NULL DEFAULT TRUE,
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

export function isSafeWebhookUrl(raw: string): boolean {
  if (!raw) return true;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      host === "0.0.0.0" ||
      host === "::1"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function getWorkspaceWebhook(userId: number): Promise<WorkspaceWebhookConfig> {
  try {
    await ensureWebhooksTable();
    const res = await pool.query(
      `SELECT webhook_url, enabled, notify_on_monitoring, notify_on_high_findings
       FROM workspace_webhooks
       WHERE user_id = $1`,
      [userId],
    );
    const r = res.rows[0];
    if (!r) return { ...DEFAULT_WEBHOOK_CONFIG };
    return {
      webhookUrl: String(r.webhook_url ?? ""),
      enabled: Boolean(r.enabled),
      notifyOnMonitoring: Boolean(r.notify_on_monitoring),
      notifyOnHighFindings: Boolean(r.notify_on_high_findings),
    };
  } catch {
    return { ...DEFAULT_WEBHOOK_CONFIG };
  }
}

export async function upsertWorkspaceWebhook(
  userId: number,
  config: WorkspaceWebhookConfig,
): Promise<WorkspaceWebhookConfig> {
  await ensureWebhooksTable();
  await pool.query(
    `INSERT INTO workspace_webhooks (user_id, webhook_url, enabled, notify_on_monitoring, notify_on_high_findings, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       webhook_url = EXCLUDED.webhook_url,
       enabled = EXCLUDED.enabled,
       notify_on_monitoring = EXCLUDED.notify_on_monitoring,
       notify_on_high_findings = EXCLUDED.notify_on_high_findings,
       updated_at = NOW()`,
    [
      userId,
      config.webhookUrl,
      config.enabled,
      config.notifyOnMonitoring,
      config.notifyOnHighFindings,
    ],
  );
  return config;
}

export async function deliverWebhookPayload(
  webhookUrl: string,
  payload: {
    title: string;
    summary: string;
    severity: "info" | "warning" | "critical";
    source: string;
  },
): Promise<{ delivered: boolean; status?: number; error?: string }> {
  if (!webhookUrl || !isSafeWebhookUrl(webhookUrl)) {
    return { delivered: false, error: "Invalid or unsafe webhook URL. Must use HTTPS." };
  }

  const tag = payload.severity === "critical" ? "[CRITICAL]" : payload.severity === "warning" ? "[ALERT]" : "[INFO]";
  const messageText = `${tag} ARDI SEC: ${payload.title}\n${payload.summary}`;

  const body = {
    text: messageText, // Slack & generic
    content: messageText, // Discord
    event: "ardi.security.alert",
    severity: payload.severity,
    title: payload.title,
    summary: payload.summary,
    source: payload.source,
    timestamp: new Date().toISOString(),
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "user-agent": "ARDI-SEC-Webhook/1.0" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return { delivered: res.ok, status: res.status, error: res.ok ? undefined : `Webhook returned HTTP ${res.status}` };
  } catch (err) {
    return {
      delivered: false,
      error: err instanceof Error ? err.message : "Webhook delivery timed out.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendWorkspaceAlertIfEnabled(
  userId: number,
  payload: {
    title: string;
    summary: string;
    severity: "info" | "warning" | "critical";
    source: string;
  },
): Promise<void> {
  const cfg = await getWorkspaceWebhook(userId);
  if (!cfg.enabled || !cfg.webhookUrl) return;
  if (payload.source === "weekly_monitoring" && !cfg.notifyOnMonitoring) return;
  await deliverWebhookPayload(cfg.webhookUrl, payload).catch(() => {});
}
