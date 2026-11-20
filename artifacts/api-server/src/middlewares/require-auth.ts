import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../lib/auth";
import { verifyWorkspaceApiKey } from "../lib/workspace-api-keys";

/**
 * Gate that rejects any request without a valid session token or workspace API key.
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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const xApiKey = typeof req.headers["x-api-key"] === "string" ? req.headers["x-api-key"].trim() : "";
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";

  const candidateApiKey = xApiKey || (bearer.startsWith("ardi_") ? bearer : "");
  if (candidateApiKey) {
    const apiPayload = await verifyWorkspaceApiKey(candidateApiKey);
    if (!apiPayload) {
      res.status(401).json({ error: "Invalid or revoked API key." });
      return;
    }
    req.user = apiPayload;
    next();
    return;
  }

  if (!bearer) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const payload = verifyToken(bearer);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired session." });
    return;
  }

  req.user = payload;
  next();
}
