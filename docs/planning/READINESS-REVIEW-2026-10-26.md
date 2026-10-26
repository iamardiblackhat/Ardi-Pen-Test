# ARDI Sec readiness review — 26 October 2026

## Verdict

**Not yet ready for unrestricted customer security operations.** Public website and defensive request-handling checks pass the tests described below. Hosted assessments, live AI replies and full customer data journeys have separate unmet gates. This is a bounded engineering review, not a penetration-test certificate or proof of every possible interaction.

## Fresh evidence

| Area | Result | Evidence and limits |
| --- | --- | --- |
| Build | Pass | Full workspace typecheck and production builds. |
| Assessment process and report rendering | Pass | 13 executable-fixture/render tests: termination, cancellation, timeout, nonzero exits, bounded output and incomplete reports. No external scans or customer database writes. |
| Threat-feed adapter | Pass | Seven tests for provenance, validation, matching, caching, limits and source failure. |
| HTTP/security primitives | Pass | Ten tests against the real Express app on an ephemeral loopback port with a dummy unreachable database: bad JSON, oversized bodies, unsupported compression, malformed chat, missing/forged authentication, security headers, scrypt passwords, token tampering, target literals/injection and forwarded honeypot routing. No real database or AI calls. |
| Public route layouts | Pass within checked cases | Ten production routes at 320/390/768/1440px: 40 cases, headings loaded, no document overflow, no broken loaded images, no unnamed visible buttons, no uncaught page errors. This does not measure every image crop, contrast ratio or pixel. |
| Private route gating | Pass | Fourteen production workspace/onboarding addresses redirected anonymous visitors to login. Production protected API reads and /auth/me returned 401. This does not prove two-account tenant isolation. |
| Interactive home | Pass | At 390/768/1440px: hero pause/resume, next carousel item, mascot hide/restore and open-chat unavailable state. |
| Production health | Pass before release | /api/healthz returned 200 and status ok. Rechecked after promotion in release validation. |
| Live AI chat | Blocked | Production /api/ardi/status reports configured:false. No AI reply, research-provider tool call or paid request is claimed verified. Existing API keys remain untouched. |
| Hosted assessment jobs | Blocked | Background process execution is not durable under Vercel request lifetimes; the existing Google Cloud project reports billing disabled. Controllers are process-local and startup reconciliation needs redesign for multiple workers. |
| End-to-end customer journeys | Unverified | No new production customer accounts created. Registration/login persistence, cross-account data isolation, owned-target job to saved findings to report download need controlled staging integration tests. |

## Corrections made during review

- Upgraded compatible runtime and build dependency paths. Before: six production advisories and 31 total workspace advisories. After: one high Zod advisory, zero critical/moderate/low advisories in the full workspace audit.
- Bound JSON/form request bodies to 64 KiB, bounded form parameters, disabled compressed request inflation and unnecessary extended form parsing.
- Return safe 400/413/415 client errors rather than 500 for malformed, oversized or unsupported request bodies.
- Reject null/primitive chat messages before dereferencing; do not forward internal provider exception text to public SSE clients.
- Add anti-framing, no-sniff, referrer and restrictive base/object headers to both API middleware and Vercel static responses. This CSP is deliberately limited; it is not a complete script-source policy.
- Route root-level decoys to the real tripwire ahead of the SPA fallback, with a reserved forwarded path.
- Correct threat-capability wording to reflect current vulnerability-record coverage and mark research as requiring a connected service.

## Remaining gates, in priority order

1. **Cloud execution:** deploy a durable hosted worker/job queue, prove restart/retry/stop semantics and make orphan reconciliation worker-aware. The laptop must not be part of production availability.
2. **Network isolation:** literal target validation is present, but a public-looking hostname can resolve to private infrastructure. Prove worker egress enforcement against private/metadata destinations, DNS changes and redirect behavior before enabling untrusted customer scans. A syntax check alone is not a complete SSRF defense.
3. **Validation dependency:** GHSA-mrhx-c7xc-m3w5 flags Zod 3.25.76; the listed fixed release is 4.6.6. The major migration requires SDK tool-schema and generated API behavior tests. Body limits reduce input work but do not close the advisory. Audit remains nonzero by design.
4. **Live assistant/research:** connect the approved hosted model configuration without changing existing keys, then verify real navigation, bounded replies and source-backed tools with request/token limits. Currently no configured model is reported in production.
5. **Customer persistence and isolation:** prove controlled signup/login, cross-account read/write rejection, authorised owned-target completion and downloads in staging, including partial-failure paths.
6. **Scaled abuse controls:** current rate-limit and honeypot maps are process-local. Shared limits, bounded state/expiry and trusted proxy handling need validation before multi-instance customer traffic.
7. **Operational acceptance:** backup/restore proof, alerting, source/license attribution for tools actually distributed, data retention/deletion and accessibility keyboard/screen-reader/contrast checks remain release gates. Proposed integrations in TOOL-RESEARCH-AND-VERIFICATION.md remain candidates, not installed features.

## Reproduce

`pnpm check:readiness` runs the full build, 30 controlled tests and the dependency audit. The audit currently exits nonzero for the documented remaining Zod advisory. HTTP tests open only a temporary loopback listener and configure a dummy database; they never require the production database or keys.

Browser results describe the production revision at review time; repeat after material UI changes. Dependency advisories are a time-specific registry snapshot, not a guarantee against unknown vulnerabilities.

Advisory: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
