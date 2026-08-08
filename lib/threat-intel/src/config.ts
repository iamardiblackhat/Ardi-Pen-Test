import { z } from "zod";

/**
 * Threat-intel configuration.
 *
 * The integration is optional by design: a client without an OpenCTI instance
 * must still get a fully working Ardi, just without enrichment. So this parses
 * to `enabled: false` rather than throwing when the vars are absent — but it
 * *does* throw when they are present and malformed, because a typo'd OpenCTI
 * URL silently disabling threat intel is exactly the failure that gets missed.
 */
const schema = z.object({
  OPENCTI_URL: z.string().url().optional(),
  OPENCTI_TOKEN: z.string().min(1).optional(),
  OPENCTI_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  /** Organisation name stamped on outbound STIX bundles. */
  OPENCTI_PRODUCER_NAME: z.string().min(1).optional(),
  OPENCTI_EXPORT_TLP: z
    .enum(["clear", "green", "amber", "amber+strict", "red"])
    .optional(),
});

export interface ThreatIntelConfig {
  enabled: boolean;
  url: string | null;
  token: string | null;
  timeoutMs: number;
  producerName: string;
  tlp: "clear" | "green" | "amber" | "amber+strict" | "red";
}

export function loadThreatIntelConfig(
  env: NodeJS.ProcessEnv = process.env,
): ThreatIntelConfig {
  const parsed = schema.safeParse(env);

  if (!parsed.success) {
    throw new Error(
      `Invalid OpenCTI configuration: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  const { OPENCTI_URL, OPENCTI_TOKEN } = parsed.data;

  // Half-configured is a mistake, not a valid "disabled" state — say so.
  if (Boolean(OPENCTI_URL) !== Boolean(OPENCTI_TOKEN)) {
    throw new Error(
      "OpenCTI is half-configured: set both OPENCTI_URL and OPENCTI_TOKEN, or neither.",
    );
  }

  return {
    enabled: Boolean(OPENCTI_URL && OPENCTI_TOKEN),
    url: OPENCTI_URL ?? null,
    token: OPENCTI_TOKEN ?? null,
    timeoutMs: parsed.data.OPENCTI_TIMEOUT_MS ?? 20_000,
    producerName: parsed.data.OPENCTI_PRODUCER_NAME ?? "Ardi",
    tlp: parsed.data.OPENCTI_EXPORT_TLP ?? "amber+strict",
  };
}
