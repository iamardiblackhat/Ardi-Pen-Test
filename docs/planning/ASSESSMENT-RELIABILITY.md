# Assessment reliability — 26 October 2026

## Implemented

- Shared scanner subprocess lifecycle: no shell, bounded output, explicit exit failure, timeout, missing binary and cancellation errors. Graceful termination escalates to forced termination after one second.
- Both built-in scanner adapters receive the run cancellation signal. A late completion can update a scan only while its database status remains running.
- Failed/stopped dashboard states disclose partial results, use the correct timeline label and distinguish a recorded zero-second duration from missing duration.
- HTML and JSON report exports disclose incomplete scan status. Completed and unscoped exports do not certify target security.

## Verification

- `pnpm --filter @workspace/api-server run test:assessments`: 13 passing tests using controlled executable fixtures and pure report rendering; no target scans or customer database writes.
- `pnpm run build`: workspace typecheck and production builds passed.
- Browser fixtures: failed, stopped and completed states at 390px and 1440px, correct labels/duration and no horizontal document overflow (six cases).

## Remaining hosting requirement

This does not establish durable production assessment execution. Run controllers remain process-local, and background assessment work needs a continuously available cloud worker or durable job runner rather than relying on a Vercel request process. The existing Google Cloud project `vm-engine-503721` could not be inspected because its API reports billing disabled. No billing, infrastructure, API keys or local model services were changed. No real scanner-to-database-to-report integration is claimed by the fixture tests.
