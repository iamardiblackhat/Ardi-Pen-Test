import { z } from "zod/v4";
import { and, eq } from "drizzle-orm";
import {
  activityTable,
  assetsTable,
  db,
  reportsTable,
  scansTable,
} from "@workspace/db";
import { startScan } from "./scan-runner";

export const ardiActionConfirmation = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("start_pen_test"),
    input: z.object({
      assetId: z.number().int().positive(),
      name: z.string().trim().min(1).max(120),
      type: z.enum(["full_stack", "web_app", "network", "api"]),
    }),
  }),
  z.object({
    name: z.literal("generate_report"),
    input: z.object({
      scanId: z.number().int().positive(),
      title: z.string().trim().min(1).max(160),
      type: z.enum(["pentest", "technical", "executive"]),
      format: z.enum(["html", "json"]),
    }),
  }),
]);

export class ArdiActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ArdiActionError";
  }
}

export async function executeArdiAction(
  userId: number,
  action: z.infer<typeof ardiActionConfirmation>,
) {
  if (action.name === "generate_report") {
    const { scanId, title, type, format } = action.input;
    const [scan] = await db
      .select({ id: scansTable.id, assetId: scansTable.assetId })
      .from(scansTable)
      .where(and(eq(scansTable.id, scanId), eq(scansTable.userId, userId)));
    if (!scan)
      throw new ArdiActionError("That scan is not in your workspace.", 404);

    const [report] = await db
      .insert(reportsTable)
      .values({
        userId,
        title,
        type,
        format,
        scanId,
        assetId: scan.assetId,
        status: "ready",
        summary: `${type.charAt(0).toUpperCase() + type.slice(1)} report generated for ${title}`,
      })
      .returning();
    const downloadUrl = `/api/reports/${report.id}/download`;
    await db
      .update(reportsTable)
      .set({ downloadUrl })
      .where(eq(reportsTable.id, report.id));
    await db.insert(activityTable).values({
      userId,
      type: "report_generated",
      title: `Security report generated: ${title}`,
      description: `Report ${report.id} was generated from scan ${scanId}.`,
      severity: "info",
    });
    return {
      ok: true,
      action: action.name,
      message: `Security report generated: ${title}.`,
      href: "/reports",
      linkLabel: "Open security reports",
    };
  }

  const { assetId, name, type } = action.input;
  const [asset] = await db
    .select({ id: assetsTable.id, name: assetsTable.name })
    .from(assetsTable)
    .where(and(eq(assetsTable.id, assetId), eq(assetsTable.userId, userId)));
  if (!asset)
    throw new ArdiActionError(
      "That approved target is not in your scope.",
      404,
    );

  const [running] = await db
    .select({ id: scansTable.id })
    .from(scansTable)
    .where(
      and(
        eq(scansTable.userId, userId),
        eq(scansTable.assetId, assetId),
        eq(scansTable.status, "running"),
      ),
    )
    .limit(1);
  if (running)
    throw new ArdiActionError(
      "A Pen Test is already running against that target.",
      409,
    );

  const [scan] = await db
    .insert(scansTable)
    .values({ userId, assetId, name, type })
    .returning();
  const started = startScan(scan.id);
  if (!started.started) {
    await db
      .delete(scansTable)
      .where(and(eq(scansTable.id, scan.id), eq(scansTable.userId, userId)));
    throw new ArdiActionError(
      started.reason ?? "The Pen Test could not be started.",
      409,
    );
  }

  return {
    ok: true,
    action: action.name,
    message: `Pen Test started against ${asset.name}.`,
    href: `/scans/${scan.id}`,
    linkLabel: "Open running Pen Test",
  };
}
