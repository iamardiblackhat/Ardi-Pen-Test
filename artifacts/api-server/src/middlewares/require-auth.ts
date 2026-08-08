import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../lib/auth";

/**
 * Gate that rejects any request without a valid session token.
 *
 * Before this, every API route was public — a fatal flaw in a product that
 * stores clients' vulnerability data. Mount this on every router except the
 * health check and the login/register pair.
 */

// Augment Express's Request so downstream handlers can read `req.user`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const payload = verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired session." });
    return;
  }

  req.user = payload;
  next();
}
