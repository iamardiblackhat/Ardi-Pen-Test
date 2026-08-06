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

const router = Router();

// Simple token: base64(userId:email) — demo only
function makeToken(id: number, email: string): string {
  return Buffer.from(`${id}:${email}`).toString("base64");
}

function parseToken(token: string): { id: number; email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [idStr, email] = decoded.split(":");
    const id = parseInt(idStr, 10);
    if (isNaN(id) || !email) return null;
    return { id, email };
  } catch {
    return null;
  }
}

// POST /api/auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email } = parsed.data;
  let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  // Auto-create user on login for demo purposes
  if (!user) {
    [user] = await db
      .insert(usersTable)
      .values({
        email,
        passwordHash: "demo",
        name: email.split("@")[0],
        role: "admin",
        orgName: "Acme Security",
      })
      .returning();
  }

  const token = makeToken(user.id, user.email);
  const response = LoginResponse.parse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgName: user.orgName,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
  res.json(response);
});

// POST /api/auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, name, orgName } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash: "demo", name, role: "admin", orgName })
    .returning();

  const token = makeToken(user.id, user.email);
  const response = RegisterResponse.parse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgName: user.orgName,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
  res.status(201).json(response);
});

// GET /api/auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const parsed = parseToken(token);
  if (!parsed) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const response = GetMeResponse.parse({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgName: user.orgName,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  });
  res.json(response);
});

export default router;
