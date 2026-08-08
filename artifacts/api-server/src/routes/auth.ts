import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  LoginBody,
  RegisterBody,
  LoginResponse,
  RegisterResponse,
  GetMeResponse,
} from "@workspace/api-zod";
import { hashPassword, verifyPassword, signToken, verifyToken } from "../lib/auth";

const router = Router();

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgName: user.orgName,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

// POST /api/auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
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
  res.status(201).json(RegisterResponse.parse({ user: serializeUser(user), token }));
});

// POST /api/auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
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
  res.json(LoginResponse.parse({ user: serializeUser(user), token }));
});

// GET /api/auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
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

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub));
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  res.json(GetMeResponse.parse(serializeUser(user)));
});

// A fixed valid scrypt hash of a random string, used only to equalise login
// timing when the email doesn't exist. Never matches a real password.
const DUMMY_HASH =
  "scrypt$32768$8$1$00000000000000000000000000000000$" +
  "0".repeat(128);

export default router;
