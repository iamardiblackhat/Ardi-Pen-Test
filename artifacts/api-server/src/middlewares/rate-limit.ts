import type { Request, Response, NextFunction } from "express";

/**
 * A minimal in-memory fixed-window rate limiter.
 *
 * Deliberately dependency-free (see lib/auth.ts's rationale for the same
 * choice) — this only needs to survive brute-force login attempts, not do
 * anything clever. Per-process state, so it resets on restart and does not
 * share counts across multiple API instances; fine for a single-instance
 * deploy, revisit if this ever runs behind a load balancer.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

function clientIp(req: Request): string {
  if (process.env["TRUST_PROXY"] === "true") {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.length > 0) {
      return xff.split(",")[0]!.trim();
    }
  }
  return req.socket.remoteAddress ?? "unknown";
}

/** `max` requests per `windowMs`, keyed by client IP. */
export function rateLimit(max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.method}:${req.baseUrl}${req.path}:${clientIp(req)}`;
    const now = Date.now();
    const existing = windows.get(key);

    if (!existing || existing.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > max) {
      res.setHeader("retry-after", Math.ceil((existing.resetAt - now) / 1000));
      res.status(429).json({ error: "Too many requests. Try again shortly." });
      return;
    }
    next();
  };
}

/** Keeps `windows` from growing forever under sustained traffic. */
export function pruneRateLimitWindows(): void {
  const now = Date.now();
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
}
