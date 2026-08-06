import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // web_app | network | cloud_aws | cloud_azure | cloud_gcp | api | mobile
  target: text("target").notNull(),
  status: text("status").notNull().default("active"), // active | inactive | scanning | pending
  riskLevel: text("risk_level").notNull().default("none"), // critical | high | medium | low | none
  tags: text("tags").array().notNull().default([]),
  lastScannedAt: timestamp("last_scanned_at"),
  openFindings: integer("open_findings").notNull().default(0),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, createdAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
