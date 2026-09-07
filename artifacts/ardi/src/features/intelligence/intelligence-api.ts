import { auth } from "@/lib/auth";
import type { IntelligenceFeed } from "./intelligence-types";
import { z } from "zod";

const kinds = [
  "campaign",
  "threat-actor",
  "malware",
  "attack-pattern",
  "indicator",
  "report",
  "vulnerability",
] as const;
const feedSchema = z.object({
  configured: z.literal(true),
  connected: z.literal(true),
  version: z.string(),
  platformUrl: z.string().nullable(),
  generatedAt: z.string().datetime(),
  totals: z.object(
    Object.fromEntries(
      kinds.map((kind) => [kind, z.number().int().nonnegative()]),
    ) as Record<(typeof kinds)[number], z.ZodNumber>,
  ),
  records: z.array(
    z.object({
      id: z.string().min(1),
      standardId: z.string().min(1),
      kind: z.enum(kinds),
      name: z.string().min(1),
      description: z.string().nullable(),
      aliases: z.array(z.string()),
      confidence: z.number().min(0).max(100).nullable(),
      createdAt: z.string().datetime().nullable(),
      updatedAt: z.string().datetime().nullable(),
      reference: z.string().nullable(),
      pattern: z.string().nullable(),
    }),
  ),
});

export async function fetchIntelligenceFeed(
  search: string,
  signal?: AbortSignal,
): Promise<IntelligenceFeed> {
  const params = new URLSearchParams({ limit: "10" });
  if (search.trim()) params.set("search", search.trim());
  const token = auth.getToken();
  const response = await fetch(`/api/intelligence/feed?${params}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    signal,
    cache: "no-store",
  });
  const body = (await response.json()) as IntelligenceFeed & { error?: string };
  if (!response.ok) {
    throw new Error(
      body.error ?? "The live intelligence feed could not be loaded.",
    );
  }
  const parsed = feedSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      "The intelligence service did not return a connected, complete feed. Please try again.",
    );
  }
  return parsed.data;
}
