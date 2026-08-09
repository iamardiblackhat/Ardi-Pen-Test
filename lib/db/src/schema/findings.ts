import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const findingsTable = pgTable("findings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  severity: text("severity").notNull(), // critical | high | medium | low | info
  status: text("status").notNull().default("open"), // open | in_progress | resolved | accepted_risk | false_positive
  category: text("category").notNull(),
  assetId: integer("asset_id").notNull(),
  scanId: integer("scan_id").notNull(),
  cve: text("cve"),
  cvss: real("cvss"),
  mitreId: text("mitre_id").notNull(),
  mitreTactic: text("mitre_tactic").notNull(),
  mitreTechnique: text("mitre_technique").notNull(),
  description: text("description").notNull(),
  remediation: text("remediation").notNull(),
  evidence: text("evidence"),
  notes: text("notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFindingSchema = createInsertSchema(findingsTable).omit({ id: true, createdAt: true });
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findingsTable.$inferSelect;
