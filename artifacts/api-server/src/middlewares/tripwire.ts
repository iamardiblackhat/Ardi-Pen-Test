import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Honeypot tripwires (defensive only).
 *
 * These paths do not exist in a legitimate client. Nothing in the frontend or
 * any integration ever requests `/.env`, `/wp-login.php`, `/.git/config`, or a
 * fake `/admin`. So a single request to one is high-confidence hostile —
 * almost always an automated scanner probing the platform itself.
 *
 * We log it and progressively rate-limit then temporarily block the source. We
 * never retaliate, scan back, or touch the caller — hacking back is a Computer
 * Misuse Act 1990 offence in the UK regardless of provocation. This is
 * detection and denial, nothing more.
 */

const TRIPWIRE_PATHS = [
  "/.env",
  "/.env.local",
  "/.git/config",
  "/wp-login.php",
  "/wp-admin",
  "/admin.php",
  "/phpmyadmin",
  "/.aws/credentials",
  "/config.php",
  "/xmlrpc.php",
];

interface Offender {
  hits: number;
  blockedUntil: number;
}

const offenders = new Map<string, Offender>();
const BLOCK_MS = 60 * 60 * 1000; // 1 hour
const HITS_BEFORE_BLOCK = 2;

/**
 * The real client IP. Behind the reverse proxy we trust the LAST hop of
 * X-Forwarded-For only if TRUST_PROXY is set — otherwise an attacker could
 * spoof the header and get an innocent IP banned. Default to the socket.
 */
function clientIp(req: Request): string {
  if (process.env["TRUST_PROXY"] === "true") {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.length > 0) {
      // Left-most is the original client when the chain is trusted.
      return xff.split(",")[0]!.trim();
    }
  }
  return req.socket.remoteAddress ?? "unknown";
}

export function tripwire(req: Request, res: Response, next: NextFunction): void {
  const ip = clientIp(req);
  const now = Date.now();
  const existing = offenders.get(ip);

  // Already blocked → deny everything until the block expires.
  if (existing && existing.blockedUntil > now) {
    res.status(403).json({ error: "Forbidden." });
    return;
  }

  const path = req.path.toLowerCase();
  const tripped = TRIPWIRE_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (tripped) {
    const record = existing ?? { hits: 0, blockedUntil: 0 };
    record.hits += 1;
    if (record.hits >= HITS_BEFORE_BLOCK) {
      record.blockedUntil = now + BLOCK_MS;
    }
    offenders.set(ip, record);

    logger.warn(
      { ip, path: req.path, ua: req.headers["user-agent"], hits: record.hits, blocked: record.blockedUntil > now },
      "honeypot tripwire hit",
    );

    // Look like an ordinary missing page — do not reveal it is a tripwire, or a
    // sophisticated attacker just avoids these paths.
    res.status(404).json({ error: "Not found." });
    return;
  }

  next();
}

/** Exposed for an admin/audit view later; also keeps the map from growing forever. */
export function pruneOffenders(): void {
  const now = Date.now();
  for (const [ip, rec] of offenders) {
    if (rec.blockedUntil < now && rec.hits < HITS_BEFORE_BLOCK) offenders.delete(ip);
  }
}
