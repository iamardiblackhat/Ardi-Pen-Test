/**
 * Authentication Route Handlers & Bearer-Token Diagnosis
 *
 * Existing Auth Architecture (Bearer Token Flow):
 * - POST /api/auth/register and POST /api/auth/login sign a stateless JWT via signToken(user).
 * - The token is returned in the JSON response payload.
 * - The SPA frontend receives the token and stores it in client-side localStorage ('ardi_auth_token').
 * - Subsequent requests attach 'Authorization: Bearer <token>' via customFetch / setAuthTokenGetter.
 * - Protected routes extract and verify the bearer token using verifyToken(header.slice(7)).
 */
import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  LoginBody,
  RegisterBody,
  LoginResponse,
  RegisterResponse,
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
} from "@workspace/api-zod";
import { hashPassword, verifyPassword, signToken, verifyToken } from "../lib/auth";
import { rateLimit } from "../middlewares/rate-limit";
import { extractToken } from "../middlewares/require-auth";

const router = Router();

// 10 attempts per 5 minutes per IP. Generous enough for a real user who
// mistypes a password a few times, tight enough to blunt brute-forcing.
const authLimiter = rateLimit(10, 5 * 60 * 1000);

const COOKIE_NAME = "ardi_auth";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function setAuthCookie(res: any, token: string): void {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}


function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgName: user.orgName,
    avatarUrl: user.avatarUrl ?? null,
    notifyScanComplete: user.notifyScanComplete,
    notifyCritical: user.notifyCritical,
    notifyWeeklyDigest: user.notifyWeeklyDigest,
    createdAt: user.createdAt.toISOString(),
  };
}

// POST /api/auth/register
router.post("/auth/register", authLimiter, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, name, orgName, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "That email is already registered." });
    return;
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid password." });
    return;
  }

  // First user of an org is its admin; later members default to analyst. Real
  // multi-tenant org modelling (orgId, invites) is the next slice of Phase 1.
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name, role: "admin", orgName })
    .returning();

  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json(RegisterResponse.parse({ user: serializeUser(user), token }));
});

// POST /api/auth/login
router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  // Verify against a real hash. No auto-create, no accepting any password.
  // On a missing user we still run a verify against a dummy hash so the
  // response time doesn't reveal whether the email exists (user enumeration).
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, DUMMY_HASH).then(() => false);

  if (!user || !ok) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json(LoginResponse.parse({ user: serializeUser(user), token }));
});


// DELETE /api/auth/logout
router.delete("/auth/logout", (req, res): void => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ message: "Logged out." });
});

// GET /api/auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
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

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub));
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  res.json(GetMeResponse.parse(serializeUser(user)));
});

// PATCH /api/auth/me
router.patch("/auth/me", async (req, res): Promise<void> => {
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

  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Every field is optional so a client can patch just the notification
  // switches without resending name/orgName.
  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Provide at least one field to update." });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, payload.sub))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  res.json(UpdateMeResponse.parse(serializeUser(user)));
});

// A fixed valid scrypt hash of a random string, used only to equalise login
// timing when the email doesn't exist. Never matches a real password.
const DUMMY_HASH =
  "scrypt$32768$8$1$00000000000000000000000000000000$" +
  "0".repeat(128);

export default router;
