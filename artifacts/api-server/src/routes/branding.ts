import { Router } from "express";
import { z } from "zod";
import {
  getWorkspaceBranding,
  upsertWorkspaceBranding,
} from "../lib/workspace-branding";

const router = Router();

const brandingBody = z.object({
  brandName: z.string().trim().max(120).default(""),
  logoUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (val) => val === "" || /^https?:\/\/.+/i.test(val),
      "Logo URL must start with https:// or http://",
    )
    .default(""),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Accent color must be a 6-digit hex code like #0f172a")
    .default("#16181d"),
  contactEmail: z
    .string()
    .trim()
    .max(160)
    .refine((val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Enter a valid contact email")
    .default(""),
  footerText: z.string().trim().max(300).default(""),
});

router.get("/settings/branding", async (req, res): Promise<void> => {
  const branding = await getWorkspaceBranding(req.user!.sub);
  res.json(branding);
});

router.put("/settings/branding", async (req, res): Promise<void> => {
  const parsed = brandingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid branding settings." });
    return;
  }
  const saved = await upsertWorkspaceBranding(req.user!.sub, parsed.data);
  res.json(saved);
});

export default router;
