import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../lib/auth";

/**
 * Gate that rejects any request without a valid session token.
 *
 * Checks HttpOnly cookie ('ardi_auth') first, then falls back to 'Authorization: Bearer <token>'
 * for backward compatibility.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.ardi_auth;
  if (cookieToken && typeof cookieToken === "string") {
    return cookieToken;
  }
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired session." });
    return;
  }

  req.user = payload;
  next();
}
