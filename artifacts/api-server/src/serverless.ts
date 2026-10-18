import app from "./app";
import { logger } from "./lib/logger";
import { reconcileOrphanedScans } from "./lib/scan-runner";

// Vercel runs this module instead of index.ts. There is no listen() call:
// the platform invokes the exported app per request. A scan left "running"
// by a killed instance is cleared once per process, not on every request.
let reconciled = false;
if (!reconciled) {
  reconciled = true;
  void reconcileOrphanedScans().catch((err: unknown) => {
    logger.error({ err }, "Failed to reconcile orphaned scans");
  });
}

export default app;
