import app from "./app";
import { logger } from "./lib/logger";
import { reconcileOrphanedScans } from "./lib/scan-runner";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// A scan left "running" by a killed process would sit at a frozen progress
// bar forever. Clear those before accepting traffic.
void reconcileOrphanedScans().catch((err: unknown) => {
  logger.error({ err }, "Failed to reconcile orphaned scans at boot");
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
