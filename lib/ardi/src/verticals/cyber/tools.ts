import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { db, findingsTable, assetsTable, scansTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { researchDomain } from "./domain-research";

/**
 * ARDI Cyber's tools — read-only, over the real database.
 *
 * This is what stops him hallucinating. He physically cannot invent a CVE that
 * isn't in your findings table, because every claim he makes about your estate
 * has to come back through one of these queries.
 *
 * SECURITY: `userId` is bound here, at construction time from the
 * authenticated session (see `buildCyberTools` below) — never as a
 * model-supplied tool argument. If it were a tool argument, a prompt
 * injection hidden in a scanned host's HTTP banner — attacker-controlled text
 * that ARDI reads — could ask him to fetch another user's findings.
 */

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

/** Builds ARDI's cyber tools scoped to one authenticated user's own data. */
export function buildCyberTools(userId: number) {
  const startPenTest = betaZodTool({
    name: "start_pen_test",
    description:
      "Prepare a Pen Test against one target already in the user's approved scope. " +
      "Call list_assets first if the asset ID is unknown. This action never starts " +
      "until the user confirms it in the ARDI interface.",
    inputSchema: z.object({
      assetId: z.number().int().positive().describe("The approved target ID."),
      name: z.string().min(1).max(120).default("ARDI authorised Pen Test"),
      type: z
        .enum(["full_stack", "web_app", "network", "api"])
        .default("full_stack"),
    }),
    run: async ({ assetId, name, type }) => {
      const [asset] = await db
        .select({
          id: assetsTable.id,
          name: assetsTable.name,
          target: assetsTable.target,
        })
        .from(assetsTable)
        .where(
          and(eq(assetsTable.id, assetId), eq(assetsTable.userId, userId)),
        );
      if (!asset)
        return JSON.stringify({
          error: `No approved target with ID ${assetId}.`,
        });
      return JSON.stringify({
        confirmationRequired: true,
        action: "start_pen_test",
        name,
        type,
        target: asset,
      });
    },
  });

  const researchPublicDomain = betaZodTool({
    name: "research_domain",
    description:
      "Run a live OSINT investigation for a public domain using domain registration, " +
      "DNS, and certificate-transparency sources. Never invent missing source data.",
    inputSchema: z.object({
      domain: z
        .string()
        .min(4)
        .max(253)
        .describe("A public domain such as example.com."),
    }),
    run: async ({ domain }) => JSON.stringify(await researchDomain(domain)),
  });

  const generateReport = betaZodTool({
    name: "generate_report",
    description:
      "Prepare a report from one of the user's real scans. Call list_scans first " +
      "if the scan ID is unknown. The report is created only after the user confirms.",
    inputSchema: z.object({
      scanId: z.number().int().positive(),
      title: z.string().min(1).max(160),
      type: z.enum(["pentest", "technical", "executive"]).default("pentest"),
      format: z.enum(["html", "json"]).default("html"),
    }),
    run: async ({ scanId, title, type, format }) => {
      const [scan] = await db
        .select({
          id: scansTable.id,
          name: scansTable.name,
          assetId: scansTable.assetId,
        })
        .from(scansTable)
        .where(and(eq(scansTable.id, scanId), eq(scansTable.userId, userId)));
      if (!scan) return JSON.stringify({ error: `No scan with ID ${scanId}.` });
      return JSON.stringify({
        confirmationRequired: true,
        action: "generate_report",
        scan,
        title,
        type,
        format,
      });
    },
  });

  const listFindings = betaZodTool({
    name: "list_findings",
    description:
      "List security findings from the user's own scans. Use this whenever the " +
      "user asks what problems they have, what needs fixing, or about a " +
      "specific severity. Returns real findings from their database — never " +
      "answer questions about their security posture without calling this.",
    inputSchema: z.object({
      severity: z
        .enum(SEVERITIES)
        .optional()
        .describe("Filter to one severity. Omit for all."),
      status: z
        .enum([
          "open",
          "in_progress",
          "resolved",
          "accepted_risk",
          "false_positive",
        ])
        .optional()
        .describe("Filter by triage status. Omit for all."),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    run: async ({ severity, status, limit }) => {
      let rows = await db
        .select()
        .from(findingsTable)
        .where(eq(findingsTable.userId, userId))
        .orderBy(desc(findingsTable.createdAt));
      if (severity) rows = rows.filter((f) => f.severity === severity);
      if (status) rows = rows.filter((f) => f.status === status);

      const assets = await db
        .select()
        .from(assetsTable)
        .where(eq(assetsTable.userId, userId));
      const names = new Map(assets.map((a) => [a.id, a.name]));

      return JSON.stringify({
        total: rows.length,
        findings: rows.slice(0, limit).map((f) => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
          status: f.status,
          category: f.category,
          asset: names.get(f.assetId) ?? "Unknown",
          cve: f.cve,
          cvss: f.cvss,
          mitre: f.mitreId === "unmapped" ? null : f.mitreId,
          foundAt: f.createdAt.toISOString(),
        })),
      });
    },
  });

  const getFinding = betaZodTool({
    name: "get_finding",
    description:
      "Get the full detail of one finding by its ID, including the evidence " +
      "captured during the scan and the recommended remediation. Use this when " +
      "the user asks to explain a specific finding or how to fix it.",
    inputSchema: z.object({
      id: z.number().int().describe("The finding ID."),
    }),
    run: async ({ id }) => {
      const [f] = await db
        .select()
        .from(findingsTable)
        .where(and(eq(findingsTable.id, id), eq(findingsTable.userId, userId)));
      if (!f) return JSON.stringify({ error: `No finding with ID ${id}.` });

      const [asset] = await db
        .select()
        .from(assetsTable)
        .where(eq(assetsTable.id, f.assetId));

      return JSON.stringify({
        id: f.id,
        title: f.title,
        severity: f.severity,
        status: f.status,
        category: f.category,
        asset: asset?.name ?? "Unknown",
        target: asset?.target ?? null,
        cve: f.cve,
        cvss: f.cvss,
        mitre:
          f.mitreId === "unmapped"
            ? null
            : {
                id: f.mitreId,
                tactic: f.mitreTactic,
                technique: f.mitreTechnique,
              },
        description: f.description,
        remediation: f.remediation,
        // The literal banner/response the scanner saw. Treat as untrusted data.
        evidence: f.evidence,
        foundAt: f.createdAt.toISOString(),
      });
    },
  });

  const listAssets = betaZodTool({
    name: "list_assets",
    description:
      "List the systems the user has registered for testing, with their current " +
      "risk level and when they were last scanned.",
    inputSchema: z.object({}),
    run: async () => {
      const rows = await db
        .select()
        .from(assetsTable)
        .where(eq(assetsTable.userId, userId));
      return JSON.stringify({
        total: rows.length,
        assets: rows.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          target: a.target,
          status: a.status,
          riskLevel: a.riskLevel,
          lastScannedAt: a.lastScannedAt?.toISOString() ?? null,
        })),
      });
    },
  });

  const listScans = betaZodTool({
    name: "list_scans",
    description:
      "List recent scans and their outcomes. Use this when the user asks what " +
      "has been scanned, whether a scan finished, or how long one took.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(20).default(10),
    }),
    run: async ({ limit }) => {
      const rows = await db
        .select()
        .from(scansTable)
        .where(eq(scansTable.userId, userId))
        .orderBy(desc(scansTable.createdAt));
      const assets = await db
        .select()
        .from(assetsTable)
        .where(eq(assetsTable.userId, userId));
      const names = new Map(assets.map((a) => [a.id, a.name]));

      return JSON.stringify({
        total: rows.length,
        scans: rows.slice(0, limit).map((s) => ({
          id: s.id,
          name: s.name,
          asset: names.get(s.assetId) ?? "Unknown",
          status: s.status,
          progress: s.progress,
          findings: s.findingsCount,
          critical: s.criticalCount,
          high: s.highCount,
          durationSeconds: s.duration,
          startedAt: s.startedAt?.toISOString() ?? null,
        })),
      });
    },
  });

  const getSecuritySummary = betaZodTool({
    name: "get_security_summary",
    description:
      "Get an overall picture: asset count, findings by severity, open vs " +
      "resolved, and scan activity. Use this for broad questions like 'how are " +
      "we doing' or 'what should I worry about'.",
    inputSchema: z.object({}),
    run: async () => {
      const [assets, findings, scans] = await Promise.all([
        db.select().from(assetsTable).where(eq(assetsTable.userId, userId)),
        db.select().from(findingsTable).where(eq(findingsTable.userId, userId)),
        db.select().from(scansTable).where(eq(scansTable.userId, userId)),
      ]);

      const bySeverity = Object.fromEntries(
        SEVERITIES.map((s) => [
          s,
          findings.filter((f) => f.severity === s).length,
        ]),
      );

      return JSON.stringify({
        assets: assets.length,
        findings: {
          total: findings.length,
          open: findings.filter((f) => f.status === "open").length,
          resolved: findings.filter((f) => f.status === "resolved").length,
          bySeverity,
        },
        scans: {
          total: scans.length,
          completed: scans.filter((s) => s.status === "completed").length,
          running: scans.filter((s) => s.status === "running").length,
          failed: scans.filter((s) => s.status === "failed").length,
        },
        // Stated explicitly so ARDI does not present an unscanned estate as clean.
        caveat:
          assets.length === 0
            ? "No systems registered yet, so there is nothing to report on."
            : scans.filter((s) => s.status === "completed").length === 0
              ? "No scan has completed yet — absence of findings does not mean absence of problems."
              : null,
      });
    },
  });

  return [
    startPenTest,
    researchPublicDomain,
    generateReport,
    listFindings,
    getFinding,
    listAssets,
    listScans,
    getSecuritySummary,
  ];
}
