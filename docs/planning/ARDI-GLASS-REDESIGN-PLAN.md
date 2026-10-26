# ADR-001: ARDI Sec liquid-glass redesign and capability verification

Status: Proposed — planning only, pending owner review.
Date: 25 October 2026
Baseline: repository main at 4cf347f. Initial review was source-only. Subsequent narrow Nmap/Nuclei CLI and parser tests are recorded in TOOL-RESEARCH-AND-VERIFICATION.md; they do not verify website integration or deployment.
Decider: owner. Preserve existing product behaviour and data throughout redesign.

## Context and decisions

ARDI Sec belongs to the Omnelia SI family but retains its security identity. This work covers public pages, sign-in/onboarding, authenticated workspace, components, motion, mascot/chat and evidence that advertised capabilities operate. It is not a replacement marketing page over the existing app.

Use the existing React/Vite app, Framer Motion, component library and token package. Update artifacts/ardi-ds/tokens.json rather than generated token outputs. Follow the design-system package instructions, including .tsx sources, when working there. API client/schema outputs remain generated from the OpenAPI contract.

Choose a shared glass foundation with targeted component redesign. A CSS-only overlay would leave old layouts, cropped mascot artwork and repetitive cards; a full rewrite would risk existing workflows. New scanning/research tools are added only for a documented missing capability, not as decoration.

Free software is not free hosting. A selected tool must have suitable licensing, reproducible deployment and a working result inside this product before its capability is advertised. Documentation proves a candidate exists; it does not prove our integration works. Production must not depend on the owner's laptop staying on.

## Design contract

- Smoky graphite translucent glass, green illumination, cyan secondary accents. Subtle prismatic edges connect the Omnelia identity without painting every panel rainbow.
- Rounded sculpted glass edges, controlled reflections and layered depth. Text/data sit on sufficiently stable surfaces; no moving bright patches behind critical numbers.
- Use the existing approved ARDI Sec artwork: dark glass, green eyes/channels, cyan smile, ARDI SEC chest and green shield. Keep its exact identity and small tabletop scale. No new generic robot.
- Transparent character placements; full body for feature illustrations. Explicitly designed face avatars are separate from full-body art. No accidental head/feet clipping or screen-blend workaround for baked backgrounds.
- Distinct card content: one clear title, useful description, actual destination/action. Remove decorative numbering, repeated labels and unnecessary arrows. No fake screenshots, invented results or duplicate illustrations disguised as different work.
- Compact mobile layouts, generally two columns where content remains readable; single column for long forms/details. Desktop uses its available width. Tables keep readable columns and intentional scrolling.
- Functional chart colours retain severity meaning: green brand styling must not turn critical findings green. No unsupported compliance scores, certifications or 'secure' verdict from an empty scan.

## Component plan

| Component | Placement and behaviour | Acceptance |
| --- | --- | --- |
| Liquid-glass shell | Shared public header/footer, workspace sidebar/top bar, menus | Consistent tokens, focus, readable overlays; no hero obstruction |
| Capability cards | Homepage and capabilities directory | Exact route/anchor; connected/unavailable states backed by capabilities, not invented availability |
| 3D stack carousel | Public capability tour / meet ARDI; existing motion/Embla where suitable | Click, swipe and keyboard; clear current item; pause any timed movement; no autoplay while reading |
| Evidence cards | Findings and report previews | Real source, severity, target, time and evidence; detail drawer links to the same record |
| Operational lists/tables | Assets, runs, findings and reports | Retain sorting, filtering, pagination and IDs; do not hide core data in carousels |
| Scan progress | Run detail | Queued/running/stopping/completed/failed derived from backend; never a fake looping success animation |
| Disclosures | FAQs, scope, technical explanation | Accurate content, keyboard controls and readable expanded text |
| Forms/dialogs | Login, registration, target creation, test confirmation, reporting, settings | Existing validation preserved; clear loading, error, empty and success states |
| Mascot widget | Bottom-right public site and workspace | Hide/unhide, responsive safe area, persistent display preference; does not cover controls |
| Capability status | Actions, assistant and intelligence pages | Distinguish absent configuration, outage, no records and no findings |

## Motion plan

Use existing Framer Motion first. Add restrained entrances, shared card transitions, interactive depth, carousel motion and mascot breathing/gestures. State-driven working/concerned/finished moods reflect real operations, not decorative claims. No fake talking/lip sync without speech. Avoid multiple background videos loading together. Pause offscreen/hidden-page motion. Reduced-motion mode removes continuous movement and parallax while keeping all functionality. Test touch, keyboard, low-power rendering, focus and overlays at 320/390/768/1440 widths.

## Mascot and assistant contract

Public guide: explain ARDI, navigate to the exact page, answer approved product questions and direct execution to sign-in. Deterministic navigation, greetings and scope redirects use no LLM call. Keep topics within ARDI/security product use; general coding/content/chat is out of scope. No private account data, scan execution or promises of provider availability for anonymous users.

Authenticated assistant: account-scoped summaries and evidence explanation; existing domain/research/intelligence tools where connected. Tool-backed answers must cite the actual record/source. Asset IDs/account identity come from authenticated server context. Navigation remains separate from executing an action.

Preserve explicit confirmation for test start/report creation. Review every direct action endpoint as well as assistant tools for consistent authorization and audit evidence. Untrusted scan banners, pages and retrieved sources are data, not instructions. No model-generated action runs just because a visitor asks it to ignore rules.

Separate public and operational budgets. Cap aggregate input, retained history, reply tokens, tool result size, iterations, duration and per-user usage; add cancellation/disconnect handling and shared durable limits where required. Source currently permits 40 messages × 8,000 characters; Anthropic branch requests up to 64,000 output tokens, while the compatible branch uses 4,096 per iteration and up to six iterations. These are configured ceilings, not measured spend. Right-size them for actual workflows and preserve room for tool reasoning where needed.

Keep EN/MK/SQ parity as an explicit implementation work item; inspect current language coverage rather than assuming the new app already supports the parent site's languages. Protect user text from translation and retain locale on navigation.

## Initial capability evidence ledger

All rows below are source-supported or integration-dependent, not runtime-certified.

| Capability / claim | Current evidence | Verification / work needed |
| --- | --- | --- |
| Accounts and isolated records | API queries inspected use userId; handoff says fixed, README still says unfixed | Two test users, cross-account IDs, expiry/logout, direct APIs; correct stale docs after proof |
| Assets, scans, findings, dashboard | Routes and database-backed queries exist | Create/read/update with isolated test data; no-results vs request failure; counts agree |
| Automated security tests | scan-runner.ts invokes nmap/nuclei or optional CyberStrike | Owned disposable target; known findings; raw evidence→DB→UI; cancellation/failure; worker lifecycle |
| Long-running scan execution | start route returns while a background runner continues; in-process running set | Prove actual hosting keeps jobs alive; durable queue/worker if required, deduplication and restart recovery |
| Public-source investigation | open-source-research.ts requires Groq-compatible configured endpoint/key and source extraction | Confirm provider model actually supports search, source links resolve and claims match evidence; not a guaranteed free research service |
| Domain evidence | domain-research.ts has real external-source requests | Approved domain; DNS/registration/cert results, missing/redacted data, timeouts, rate limits |
| Threat intelligence | OpenCTI adapter, configured/connected/503 states | Source populated and reachable; ingestion freshness, search matches, empty-state honesty |
| Findings / technique context | Account-scoped findings and MITRE mapping helpers | Correct severity/CVE/CVSS provenance; unmapped stays unmapped; no automatic compliance certification |
| Reports | Real data gathered; JSON and print-ready HTML downloads | Filename/content/authorization/content agreement; legacy format pdf currently returns HTML, and UI correctly says print-ready document. Add real PDF only if wanted |
| Public mascot chat | Public vertical has no tools | Product-only scope and route navigation, unavailable path, no fake operational results |
| Authenticated chat/actions | User-bound tools and confirmation endpoint | Real tool use, read isolation, explicit confirm, cancel/retry/idempotency, no false success |
| Mascot media | ArdiAvatar uses old JPGs with cover and 2.3–2.6 scaling | Replace with approved transparent glass assets; full-body contexts must show entire character |
| Hero media | Three video scene entries share one poster path | Inspect actual files; distinct correct previews, asset loading/fallback and motion controls |

Key source locations: artifacts/ardi/src/app/router/app-router.tsx; features/security-home; features/capabilities/capability-content.ts; components/ardi-avatar.tsx; artifacts/api-server/src/routes/{ardi,scans,reports,dashboard,osint,intelligence}.ts; artifacts/api-server/src/lib/{scan-runner,ardi-actions}.ts; lib/ardi/src/verticals/cyber; lib/scan-engine; lib/threat-intel. Earlier README/HANDOFF assertions do not override current code or deployment evidence.

## Free-tool candidates — not installed or runtime-tested here

| Candidate | Fit | Conditions / proof |
| --- | --- | --- |
| Existing Nuclei | Existing template scanner; preserve before adding another | Official engine MIT; pin engine/templates, review template-specific terms, run known safe test and capture real findings. https://github.com/projectdiscovery/nuclei |
| ZAP Automation Framework | Additional web/API coverage if an actual gap requires it | Apache-2.0 project; reproducible worker job, explicit scan scope/auth and evidence ingestion. Not a replacement for manual business-logic testing. https://www.zaproxy.org/docs/automate/automation-framework/ |
| Gotenberg | Actual downloadable PDF from current report HTML | MIT project; self-hosted service, resource limits/network isolation and real PDF output/content checks. Hosting still required. https://gotenberg.dev/docs/convert-with-chromium/convert-html-to-pdf |
| Naabu | Optional port discovery alternative if existing scanner licensing/deployment requires change | MIT project; not equivalent to all Nmap service identification/NSE capabilities. Test any feature loss before replacement. https://github.com/projectdiscovery/naabu |

Nmap is already integrated but its NPSL differs from a permissive open-source license; do not promise unrestricted free embedding/redistribution. Check intended deployment/distribution against official terms before selecting the commercial packaging approach: https://nmap.org/book/man-legal.html . No legal conclusion about this deployment is made here.

For research, threat feeds and LLMs, separate free software, public data, limited free API tiers and paid compute. Do not treat any provider's marketing page as proof of unlimited free production usage. Select alternatives only after documenting the precise unavailable behaviour and testing the replacement.

## Execution sequence and acceptance gates

1. Baseline: install via pnpm lockfile in the project, inspect runnable environments without exposing keys; inventory routes/claims/components. Capture existing public/workspace desktop/mobile states. Build/typecheck and exercise baseline flows; source-only findings remain labelled.
2. Capability ledger: each public/assistant promise links to implementation, config needs and a reproducible test. Mark implemented, verified locally, verified deployed, unavailable or missing separately. Fix or explicitly remove unsupported claims; do not hide a missing feature with polished artwork.
3. Visual foundation: tokens, glass shell, typography, severity/readability, responsive breakpoints and transparent mascot. Establish representative public page + dense workspace + form/dialog before applying globally.
4. Components and motion: cards, public carousel, lists/charts, actual progress, overlays and full page rollout. Preserve flows and data contracts. Review both mobile and desktop as changes land.
5. Assistant: public navigation/scope/budgets first; then authenticated evidence tools, confirmations and account boundaries. Preserve existing capabilities; no generic chat rewrite that removes tools.
6. Missing capabilities: implement only evidenced gaps with selected tools; run isolated proof jobs and attach outputs. Configure persistent hosting/worker where necessary, never the owner's always-on laptop.
7. Final regression: public navigation; signup/login/logout; onboarding; authorized target; approved test; findings/evidence; report download; threat/research error states; chat and confirmation; accessibility/reduced motion; device layouts; provider/cost limits. No production records changed for testing.

A feature is delivered only after the real chain passes: UI → API → authorized operation → persisted result → matching UI/report. A unit test, screenshot or installed binary alone is not proof. Use disposable owned targets and isolated test accounts; no external customer tests as part of design verification.

## Deliverables and completion criteria

- Visual contract and reusable component inventory applied to public pages and workspace.
- Page-by-page capability ledger, defect list and regression evidence with test environment/revision.
- Exact glass ARDI Sec mascot and site-wide guide; task-based workspace assistant retained.
- Actual working outputs for enabled tools, with unavailable states for disconnected integrations.
- Deployment plan confirming runtime/worker readiness and operating costs; no claim that software with no license fee has zero running cost.
- No UI implementation, dependency install, scanner job, provider call, database mutation, commit, push or deployment authorized merely by this proposed planning document. Owner review is the next step before implementation.

## Expanded scope and corrected evidence status

The comprehensive platform scope is in [SECURITY-PLATFORM-EXPANSION.md](SECURITY-PLATFORM-EXPANSION.md). Existing people/company research is preserved; structured profile collection, cases and evidence workflows are additions. The [research/verification register](TOOL-RESEARCH-AND-VERIFICATION.md) explicitly separates documentation review, narrow smoke tests and unverified integrations. No general claim that proposed tools work in ARDI is made.
