import { logger } from "./logger";

/**
 * CyberStrike engine adapter.
 *
 * Drives a locally-running CyberStrike server (`cyberstrike serve`) over its
 * HTTP API. This is the real autonomous pentest engine — Ardi is the
 * client-facing layer; CyberStrike does recon, exploitation and reporting with
 * its own agents and skills, using the AI providers configured on the host.
 *
 * Env:
 *   CYBERSTRIKE_URL       default http://127.0.0.1:4096
 *   CYBERSTRIKE_PASSWORD  the server password (basic auth)
 *   CYBERSTRIKE_PROVIDER  provider id (e.g. "anthropic", "ollama-cloud")
 *   CYBERSTRIKE_MODEL     model id for that provider
 *
 * Optional. If CYBERSTRIKE_URL/PASSWORD are unset the adapter reports
 * unavailable and Ardi falls back to its built-in nmap/nuclei runners.
 */

export interface CyberStrikeVuln {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description?: string;
  cwe_id?: string;
  steps_to_reproduce?: string;
  business_impact?: string;
  recommendation?: string;
  poc?: string;
  endpoint?: string;
  attack_vector?: string;
}

function config() {
  const url = process.env["CYBERSTRIKE_URL"] ?? "http://127.0.0.1:4096";
  const password = process.env["CYBERSTRIKE_PASSWORD"];
  const provider = process.env["CYBERSTRIKE_PROVIDER"];
  const model = process.env["CYBERSTRIKE_MODEL"];
  return { url: url.replace(/\/+$/, ""), password, provider, model };
}

export function cyberStrikeConfigured(): boolean {
  const c = config();
  // Only the server URL + password are required. Provider/model are optional —
  // if unset, we auto-pick whatever the CyberStrike host already has configured
  // (Ollama, OpenRouter, a local model, anything). We do not force Anthropic.
  return Boolean(c.password);
}

/**
 * Pick a provider/model to drive the mission. Honours CYBERSTRIKE_PROVIDER /
 * CYBERSTRIKE_MODEL if set, otherwise takes the first provider CyberStrike has
 * credentials for and its first model. Model-agnostic by design.
 */
async function resolveModel(): Promise<{ providerID: string; modelID: string }> {
  const c = config();
  if (c.provider && c.model) return { providerID: c.provider, modelID: c.model };

  const data = await api<{
    providers: { id: string; models: Record<string, unknown> }[];
  }>("/config/providers", { timeoutMs: 8000 });

  // Prefer a local/free provider first so scans don't silently spend on a paid
  // API unless the operator explicitly chose one.
  const order = ["ollama", "ollama-cloud", "lmstudio", "openrouter", "anthropic", "openai"];
  const providers = data.providers ?? [];
  const ranked = [...providers].sort(
    (a, b) => rank(order, a.id) - rank(order, b.id),
  );
  for (const p of ranked) {
    const first = Object.keys(p.models ?? {})[0];
    if (first) {
      if (c.provider && !c.model) return { providerID: c.provider, modelID: first };
      return { providerID: p.id, modelID: first };
    }
  }
  throw new Error("CyberStrike has no provider/model configured. Run `cyberstrike auth` to add one.");
}

function rank(order: string[], id: string): number {
  const i = order.findIndex((o) => id.toLowerCase().includes(o));
  return i === -1 ? order.length : i;
}

function authHeader(password: string): string {
  return "Basic " + Buffer.from(`cyberstrike:${password}`).toString("base64");
}

async function api<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const c = config();
  if (!c.password) throw new Error("CyberStrike not configured (CYBERSTRIKE_PASSWORD).");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 30_000);
  try {
    const res = await fetch(`${c.url}${path}`, {
      ...init,
      headers: {
        authorization: authHeader(c.password),
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`CyberStrike ${path} -> ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** True if the CyberStrike server answers its health check. */
export async function cyberStrikeHealthy(): Promise<boolean> {
  try {
    const h = await api<{ healthy: boolean }>("/global/health", { timeoutMs: 4000 });
    return h?.healthy === true;
  } catch {
    return false;
  }
}

export interface CyberStrikeRun {
  sessionId: string;
  vulnerabilities: CyberStrikeVuln[];
}

/**
 * Run an autonomous pentest against a target and return the vulnerabilities
 * CyberStrike found. Polls the session's vulnerability list until the mission
 * settles or the deadline passes.
 *
 * `onProgress` receives coarse status; CyberStrike's fine-grained activity is
 * on its own event stream, which we surface separately later.
 */
export async function runCyberStrikeScan(opts: {
  target: string;
  scanName: string;
  onProgress?: (pct: number, message: string) => void;
  signal?: AbortSignal;
  deadlineMs?: number;
}): Promise<CyberStrikeRun> {
  const model = await resolveModel();

  const deadline = Date.now() + (opts.deadlineMs ?? 20 * 60 * 1000);
  opts.onProgress?.(4, `Starting CyberStrike engine (${model.providerID}/${model.modelID})`);

  // 1. Create a session for this scan.
  const session = await api<{ id: string }>("/session", {
    method: "POST",
    body: JSON.stringify({ title: opts.scanName }),
  });
  const sessionId = session.id;
  logger.info({ sessionId, target: opts.target }, "CyberStrike session created");

  // 2. Send the mission. The prompt is the whole instruction set — CyberStrike
  //    picks the skills and tools. Kept explicit about authorisation and scope.
  const prompt =
    `Perform an authorised security assessment of ${opts.target}. ` +
    `Enumerate services, identify vulnerabilities, and record each confirmed ` +
    `finding with severity, evidence, and a concrete remediation. Stay strictly ` +
    `within the single target ${opts.target}. Do not touch any other host.`;

  await api(`/session/${sessionId}/message`, {
    method: "POST",
    body: JSON.stringify({
      model: { providerID: model.providerID, modelID: model.modelID },
      noReply: false,
      parts: [{ type: "text", text: prompt }],
    }),
    timeoutMs: 60_000,
  });

  opts.onProgress?.(20, "CyberStrike agents working");

  // 3. Poll for vulnerabilities and completion.
  let lastCount = -1;
  let idleChecks = 0;
  while (Date.now() < deadline) {
    if (opts.signal?.aborted) {
      await api(`/session/${sessionId}/abort`, { method: "POST" }).catch(() => {});
      throw new Error("cancelled");
    }
    await sleep(6000);

    const vulns = await api<CyberStrikeVuln[]>(`/session/${sessionId}/vulnerability`).catch(() => []);
    const status = await api<{ active?: boolean; running?: boolean }>(`/session/status`).catch(
      () => ({}) as { active?: boolean; running?: boolean },
    );

    if (vulns.length !== lastCount) {
      lastCount = vulns.length;
      idleChecks = 0;
      opts.onProgress?.(Math.min(90, 20 + vulns.length * 8), `Found ${vulns.length} issues so far`);
    } else {
      idleChecks++;
    }

    const stillRunning = status.active === true || status.running === true;
    // Settle: no new findings for several checks and the session reports idle.
    if (!stillRunning && idleChecks >= 3) break;
    if (idleChecks >= 20) break; // hard stop on a stuck session
  }

  const vulnerabilities = await api<CyberStrikeVuln[]>(`/session/${sessionId}/vulnerability`).catch(() => []);
  opts.onProgress?.(95, `CyberStrike finished: ${vulnerabilities.length} findings`);

  return { sessionId, vulnerabilities };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
