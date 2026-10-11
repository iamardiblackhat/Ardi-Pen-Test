import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { db, scansTable, assetsTable } from "@workspace/db";
import { reconcileOrphanedScans } from "./scan-runner";

describe("reconcileOrphanedScans", () => {
  test("reconciles orphaned scans correctly and measures query count & duration", async () => {
    const itemCount = 500;
    const mockOrphanedScans = Array.from({ length: itemCount }, (_, i) => ({
      id: i + 1,
      userId: 1,
      name: `Scan ${i + 1}`,
      type: "network",
      status: "running",
      assetId: (i % 50) + 1, // 50 unique assets among 500 scans
      progress: 50,
      createdAt: new Date(),
    }));

    let queryCount = 0;
    const executedQueries: string[] = [];

    // Save original methods
    const originalSelect = db.select;
    const originalUpdate = db.update;

    try {
      // Mock db.select
      (db as any).select = () => {
        queryCount++;
        executedQueries.push("SELECT");
        return {
          from: () => ({
            where: async () => mockOrphanedScans,
          }),
        };
      };

      // Mock db.update
      (db as any).update = (table: any) => {
        queryCount++;
        const tableName = table === scansTable ? "scans" : table === assetsTable ? "assets" : "unknown";
        executedQueries.push(`UPDATE ${tableName}`);
        return {
          set: () => ({
            where: async () => {},
          }),
        };
      };

      const start = performance.now();
      const count = await reconcileOrphanedScans();
      const duration = performance.now() - start;

      assert.equal(count, itemCount);
      console.log(`\n--- BENCHMARK RESULTS ---`);
      console.log(`Orphaned items: ${itemCount}`);
      console.log(`Total DB Queries: ${queryCount}`);
      console.log(`Time taken: ${duration.toFixed(2)} ms`);
      console.log(`-------------------------\n`);
    } finally {
      (db as any).select = originalSelect;
      (db as any).update = originalUpdate;
    }
  });
});
