# Readiness follow-up — 27 October 2026

## Completed and verified

- Migrated the workspace to patched Zod 4.6.6, including all transitive resolutions. Actual authenticated assistant tools build SDK JSON schemas and accept/reject controlled inputs correctly. Full workspace typechecks and production builds pass.
- Updated qs to 6.16.1 for the newly reported compatible security fix. Fresh full dependency audit: **no known vulnerabilities**. No advisories are ignored or suppressed.
- Added six customer integration tests against the actual Express routes and Drizzle queries, with a temporary in-memory PostgreSQL engine (PGlite), two disposable accounts and no production data.
- Verified registration, password login, wrong-password rejection, ownership checks on targets, scan creation, findings and report downloads. Missing/forged sessions remain covered by the HTTP suite.
- Verified API → scanner executable fixture → database findings → completed JSON report. Scanner executables emit controlled output and make no network requests. This proves application wiring, not real vulnerability coverage or hosted-worker durability.
- Verified incomplete scan reports retain their warning and report downloads reject anonymous and other-account access.
- Added an explicit scan ownership check to `/api/scans/:id/findings`. Previously an inaccessible scan returned an empty 200 response; now it returns 404 consistently with the scan-detail endpoint. Existing user filtering already prevented findings disclosure.

## Reproduction and evidence

`pnpm check:readiness` exits **0** with the full build, 13 scanner/report tests, seven threat-feed tests, 11 HTTP/auth/tool-schema tests, six SQL-backed customer journey tests, and the full dependency audit: **37 tests passed**.

`pnpm --filter @workspace/api-server run test:customers` runs only the isolated SQL-backed suite. Test runner redirects the database module only inside its esbuild test bundle; production code still uses the existing PostgreSQL connection. Test database contents, executable fixtures and test bundles are discarded. PGlite is a development dependency only. No Docker, installed database service, production account or model call is required.

## Still separate from these proofs

- Durable cloud worker, worker-aware restart/reconciliation and network egress restrictions remain required before untrusted customer scans.
- Live model/research configuration and real provider tool execution remain unverified by these tests. Existing keys and billing settings were not changed.
- The fixture uses the application schema and real PostgreSQL execution in WASM. It does not prove the deployed database schema, migrations, connection pooling, backups, or live browser/customer environment.
- Shared abuse limits, restore drills and accessibility acceptance remain in the previous readiness register.

The dependency and isolated customer-workflow gates are closed for the tested revision. The platform is **not certified for unrestricted customer security operations**.

References: [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [Zod migration guide](https://zod.dev/v4/changelog), [PGlite documentation](https://pglite.dev/docs/).
