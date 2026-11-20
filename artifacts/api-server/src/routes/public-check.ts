import { Router } from "express";
import net from "node:net";
import { z } from "zod";
import { rateLimit } from "../middlewares/rate-limit";
import { runEmailDnsAudit } from "../lib/email-dns-audit";

const router = Router();

const quickCheckBody = z.object({
  target: z.string().trim().min(3).max(200),
});

interface QuickCheckItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  fix?: string;
}

function isPrivateOrLocalHost(host: string): boolean {
  const lower = host.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower === "0.0.0.0" ||
    lower === "::1"
  ) {
    return true;
  }
  if (net.isIPv4(lower)) {
    const parts = lower.split(".").map(Number);
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  }
  return false;
}

function normalizeHost(raw: string): string | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  if (!cleaned || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) return null;
  if (isPrivateOrLocalHost(cleaned)) return null;
  return cleaned;
}

async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "ARDI-SEC-QuickCheck/1.0" },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function gradeFromScore(score: number): { grade: string; label: string } {
  if (score >= 95) return { grade: "A+", label: "Excellent protection" };
  if (score >= 85) return { grade: "A", label: "Strong security posture" };
  if (score >= 75) return { grade: "B", label: "Good, a few gaps to close" };
  if (score >= 60) return { grade: "C", label: "Fair, noticeable risks found" };
  if (score >= 45) return { grade: "D", label: "Weak, fix high-priority gaps soon" };
  return { grade: "F", label: "At risk, immediate attention recommended" };
}

router.post(
  "/public/quick-check",
  rateLimit(10, 60_000),
  async (req, res): Promise<void> => {
    const parsed = quickCheckBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter a valid website domain like example.com." });
      return;
    }

    const host = normalizeHost(parsed.data.target);
    if (!host) {
      res.status(400).json({ error: "Enter a public website domain like yourcompany.com." });
      return;
    }

    const [httpsRes, envRes, gitRes, emailAudit] = await Promise.all([
      fetchWithTimeout(`https://${host}/`, 5000),
      fetchWithTimeout(`https://${host}/.env`, 3000),
      fetchWithTimeout(`https://${host}/.git/HEAD`, 3000),
      runEmailDnsAudit(host),
    ]);

    const checks: QuickCheckItem[] = [];
    let score = 100;

    // 1. HTTPS reachability
    if (!httpsRes) {
      score -= 30;
      checks.push({
        id: "https",
        label: "Encrypted HTTPS Connection",
        status: "fail",
        detail: `Could not establish an HTTPS connection to ${host}.`,
        fix: "Install a valid SSL/TLS certificate (for example via Let's Encrypt or Cloudflare) and redirect HTTP to HTTPS.",
      });
    } else {
      checks.push({
        id: "https",
        label: "Encrypted HTTPS Connection",
        status: "pass",
        detail: `Website responded over HTTPS (HTTP ${httpsRes.status}).`,
      });

      const h = httpsRes.headers;
      const missingHeaders: string[] = [];
      if (!h.get("strict-transport-security")) missingHeaders.push("Strict-Transport-Security (HSTS)");
      if (!h.get("content-security-policy")) missingHeaders.push("Content-Security-Policy (CSP)");
      if (!h.get("x-frame-options") && !h.get("content-security-policy")?.includes("frame-ancestors")) {
        missingHeaders.push("X-Frame-Options");
      }
      if (!h.get("x-content-type-options")) missingHeaders.push("X-Content-Type-Options");

      if (missingHeaders.length === 0) {
        checks.push({
          id: "headers",
          label: "Browser Security Headers",
          status: "pass",
          detail: "All core browser security headers (HSTS, CSP, clickjacking, MIME protection) are present.",
        });
      } else {
        score -= Math.min(24, missingHeaders.length * 6);
        checks.push({
          id: "headers",
          label: "Browser Security Headers",
          status: missingHeaders.length >= 3 ? "fail" : "warn",
          detail: `Missing ${missingHeaders.length} recommended header${missingHeaders.length === 1 ? "" : "s"}: ${missingHeaders.join(", ")}.`,
          fix: "Add HSTS, Content-Security-Policy, X-Frame-Options, and X-Content-Type-Options in your web server or Cloudflare rules.",
        });
      }
    }

    // 2. Exposed sensitive files (.env / .git)
    let envExposed = false;
    if (envRes && envRes.status === 200) {
      const body = (await envRes.text().catch(() => "")).slice(0, 400);
      if (/^[A-Z0-9_]{3,}=/m.test(body)) envExposed = true;
    }
    let gitExposed = false;
    if (gitRes && gitRes.status === 200) {
      const body = (await gitRes.text().catch(() => "")).slice(0, 200);
      if (body.includes("ref: refs/")) gitExposed = true;
    }

    if (envExposed || gitExposed) {
      score -= 35;
      checks.push({
        id: "exposed-files",
        label: "Exposed Secret Files",
        status: "fail",
        detail: `${envExposed ? "/.env" : ""}${envExposed && gitExposed ? " and " : ""}${gitExposed ? "/.git/HEAD" : ""} appears publicly readable.`,
        fix: "Block access to hidden dotfiles (/.env, /.git) immediately in your web server config and rotate any exposed keys.",
      });
    } else {
      checks.push({
        id: "exposed-files",
        label: "Exposed Secret Files",
        status: "pass",
        detail: "No public /.env or /.git repository files were exposed.",
      });
    }

    // 3. Email spoofing protection (SPF & DMARC)
    if (emailAudit.spf.status === "fail") score -= 12;
    else if (emailAudit.spf.status === "warn") score -= 5;

    if (emailAudit.dmarc.status === "fail") score -= 15;
    else if (emailAudit.dmarc.status === "warn") score -= 6;

    checks.push({
      id: "spf",
      label: "Email Sender Protection (SPF)",
      status: emailAudit.spf.status,
      detail: emailAudit.spf.explanation,
      fix: emailAudit.spf.status !== "pass" ? `Add DNS record: ${emailAudit.spf.recommendedRecord}` : undefined,
    });

    checks.push({
      id: "dmarc",
      label: "Fake Email Blocking (DMARC)",
      status: emailAudit.dmarc.status,
      detail: emailAudit.dmarc.explanation,
      fix: emailAudit.dmarc.status !== "pass" ? `Add DNS record: ${emailAudit.dmarc.recommendedRecord}` : undefined,
    });

    const boundedScore = Math.max(0, Math.min(100, score));
    const { grade, label } = gradeFromScore(boundedScore);

    res.json({
      domain: host,
      checkedAt: new Date().toISOString(),
      score: boundedScore,
      grade,
      gradeLabel: label,
      checks,
      emailAudit,
    });
  },
);

export default router;
