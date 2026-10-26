# ARDI Sec comprehensive platform — expanded planning scope

Status: proposed, planning only. Updated 25 October 2026. This expands ADR-001; it does not authorize implementation or deployment.

## Corrected starting point

Read the existing public capability catalogue, research page/form, research API/provider adapter, assistant tools/public/private prompts, routes, database schemas, scan runners/parsers, report routes, README and HANDOFF before classifying additions.

Already present in source: person/company/event research with citations and UK/Europe/global filters; domain registration/DNS/certificate research; connected OpenCTI intelligence; asset/scan/finding workflows; MITRE context; JSON/print-ready reports; registration/login/profile/settings; public and authenticated chat; confirmed scan/report actions. Do not pitch these as newly added features. Configuration and production verification remain separate questions.

Existing research is largely a question→provider answer/source-links flow. Additional structured collection, identity review, case management, repeatable investigations and specialised technical assessments form the expansion. The inspected schemas contain users/assets/scans/findings/reports/activity, not a complete organisation/case/evidence/session-management platform.

## Proposed product modules and website interactions

| Module | Additions beyond the existing baseline | User operates through ARDI |
| --- | --- | --- |
| Investigation cases | Persistent cases, objectives, collaborators, tasks, notes, evidence ledger, timeline, source snapshots/hashes and export | Create case → collect → review → report; private case workspace |
| People and public profiles | Username/profile discovery, aliases, explicit identity candidates, source-based comparison and analyst confirmation | Enter name/known username/public URL; review candidate profiles; accept/reject relationships |
| Organisation research | Public-domain/email references, website/document evidence, organisational relationships and source connectors | Company case → select sources → review evidence, contradictions and coverage |
| Investigation graph | People, organisations, profiles, domains, emails, IPs and documents connected by evidenced edges | Filter graph, inspect why an edge exists, correct/unlink; accessible list alternative |
| Domain/brand monitoring | Subdomain expansion, new/removed assets, certificate changes, lookalike domains and public impersonation indicators | Add owned brand/domain; establish baseline; compare subsequent observations; review alerts |
| Exposure management | Normalised external inventory, HTTP/TLS/email posture, technology changes, asset ownership and scope | Discover → approve assets → assess; discovery never silently expands testing permission |
| Web application testing | Targeted crawling/authenticated coverage and repeatable template/DAST checks | Approved target/session → choose safe assessment profile → job/evidence/findings |
| API assessment | OpenAPI/GraphQL schema input, validation/authorization checks, reusable staging credentials and reproducible failures | Upload schema/connect staging API → confirm scope → run → inspect requests/results |
| Code and secret security | Repository/file intake, SAST, secret findings, redaction, code location, triage and retest | Connect approved repo/upload archive → select checks → review/export; no untrusted build execution by default |
| Dependency and supply chain | SBOM generation/import, vulnerable dependencies, license inventory and recurring version comparison | Upload SBOM/image/repo → inspect affected versions → prioritise/remediate/recheck |
| Cloud posture | Read-only cloud integrations, permissions review, configuration findings and evidence mapping | Connect narrowly scoped customer cloud account → assess → view gaps; no automatic remediation |
| Container/Kubernetes | Image/configuration checks, cluster posture and optional runtime alerts | Upload image reference/manifests or enroll connector → assess; runtime requires deployed sensor |
| Endpoint monitoring | Enrolled host inventory, event/log ingestion, integrity changes, detection and agent health | Enroll owned endpoint → confirm live heartbeat → review alerts; website cannot inspect unconnected devices |
| Network monitoring | Passive telemetry and detection from customer sensors or uploaded captures | Connect sensor/import capture → inspect timelines and indicators; cannot observe arbitrary networks from a website |
| Incident response | Alert-to-case workflow, assignments, approvals, host collection requests and evidence timeline | Investigate incident → request approved collection → track evidence and response decisions |
| File analysis | Hash/type/metadata, signature/rule scanning, quarantine and evidence export | Upload permitted file into isolated analysis; no automatic execution of unknown binaries |
| Mobile app assessment | Static package analysis first; instrumented dynamic lab as a separate capability | Upload owned APK/IPA → job → findings; dynamic coverage only on supported validated lab setup |
| AI application assessment | Prompt-injection/data-leakage robustness probes, policy checks, reproducible transcripts and model-cost caps | Connect approved test endpoint → select controlled evaluation → inspect scored evidence and limitations |
| Threat intelligence expansion | Preserve OpenCTI; add feed health, provenance/freshness, IOC enrichment, watchlists and case links | Search/filter; inspect source/time/confidence; turn evidence into a case without claiming an attack occurred |
| Remediation and evidence | Owners, due dates, comments, exceptions, duplicate findings, retesting and history | Assign → fix → retest → accept result; never mark resolved from an AI statement alone |
| Assurance workspace | Control/evidence mappings, gaps and report packs | Track supporting evidence; do not equate scanner output to certification |

Phone/email research is limited to public references and valid source-supported metadata. No promise of precise phone location, access to private accounts, universal owner lookup or verified identity from a username match. Blocked/unavailable sites remain partial coverage, not 'no account'. Public-source data and search providers have their own permissions, quotas and terms.

## Dashboards and account structure

- Customer overview: actual asset coverage, running jobs, open findings, investigations and recent alerts; no fake risk score or pretend live data.
- Investigation dashboard: cases, tasks, entities, source coverage, uncertain matches and review queues.
- Security testing dashboard: approved targets, jobs, results, exclusions, failures, retests and evidence.
- Threat intelligence dashboard: existing feed/search expanded with source health, freshness, watchlists, IOC detail and linked investigations.
- Cloud/container dashboard: connected accounts/images/clusters, last successful assessments, permissions and posture changes.
- Endpoint/network operations dashboard: enrolled sensors, last heartbeat, detection events and collection requests; distinguish offline from healthy.
- Customer administration: organisations/workspaces, invitations, roles, project access, profile, notification delivery status, export/deletion and usage.
- Account security: registration/verification/recovery, MFA, session list/revocation, sign-in events and suspicious-sign-in review. Existing login is preserved while these controls are added.
- Platform administration: customers, memberships, audit events, connector health, job queues, tool versions, provider/storage/compute limits, retention, failures and support access auditing. Administrative access is explicit, not unrestricted browsing of customer evidence.

Use shared tenant/organisation membership and server-side authorization throughout. The current role/orgName user fields alone do not establish a complete organisational RBAC system. Customer, analyst, reviewer, organisation admin and platform admin need separate permission tests. Authentication/SSO tooling is a candidate decision, not justification for rewriting working auth immediately.

## Backend integration and ARDI branding

All normal screens, cards, chat, jobs and reports use ARDI names describing outcomes, such as Public Profile Search, Website Assessment or File Review. Do not embed upstream dashboards/logos as the product interface.

An adapter layer converts each selected tool's inputs/results into ARDI entities, findings, evidence and job states. Keep original tool/version/template provenance in protected operational records and required report/legal contexts; branding must not destroy auditability or strip required notices.

A standard footer link to Third-party Software & Notices provides readable acknowledgements, source links, versions, applicable license texts and required modification/source information. Check obligations per exact pinned version and packaging/deployment: a footer page is not automatically sufficient for copyleft/network-source requirements. Do not hide required notices in unreadable text. Unrequired upstream promotional branding need not appear in the main UI. Obtain license-fit review before choosing an integration that conflicts with the intended product model.

## Execution architecture

ARDI React UI → authenticated API → capability registry/permission checks → durable job queue → isolated capability-specific workers → normalised evidence store → customer results/dashboard/report.

Use scheduled collectors only when a working server-side scheduler, source access and budget exist. Persistent workers/sensors run on hosted infrastructure, not the owner's Mac. Keep untrusted code/file jobs isolated from accounts/databases and other tenants. Containers may run on hosted servers; do not install Docker on the owner's Mac.

Each feature declares: required input/credentials/agent, passive vs active action, tenant permission, resource ceiling, cancellation semantics, artifacts, tool/version, parser schema and visibility state. APIs, job status and UI agree on available/unavailable/degraded/partial; a menu item alone proves nothing.

## Proof standard — applies to every selected tool

1. Pin a release/commit and artifact hash; verify exact licensing, features and resource/maintenance fit.
2. Run a deterministic positive fixture and a negative control in isolation; preserve raw output, command/version, timestamps and exit status. No real person searches or third-party security tests are used as initial fixtures.
3. Test invalid input, missing credentials/binaries, partial results, cancellation, timeout and source failure; check false-positive handling where relevant.
4. Parse/normalise real output; preserve evidence and unknown values, not a fabricated successful result.
5. Exercise the ARDI UI→API→worker→storage→UI/report path with isolated accounts and test data; test cross-tenant denial and confirm-before-action.
6. Verify the deployed worker/connector actually operates and survives the promised job lifecycle. Record test revision/environment and known coverage limits.
7. Only then mark the exact tested feature verified. 'README reviewed', installed binary, CLI proof, integration proof and deployment proof are distinct statuses.

All tools in the research register remain unverified except the explicitly recorded narrow Nmap/Nuclei smoke checks. A custom marker match does not prove broad vulnerability detection, CVE coverage or penetration-test quality.

## Phased comprehensive delivery

A. Baseline and capability registry; source/runtime ledger, tenancy design, job/evidence contracts, expanded navigation and design prototype.
B. Investigation depth: preserve existing research, add case/entity/evidence workflows and verified public-profile/organisation collectors.
C. Exposure/web/API assessments and reporting: preserve existing tests, prove runners, add selected missing coverage and real output contracts.
D. Code/secrets/supply-chain/cloud/container modules after their connectors and worker proofs.
E. Monitoring/incident/file/mobile/AI modules after sensor/lab/source requirements and resource budgets are proven.
F. Full customer/admin dashboards, assistant permissions/budgets, multilingual mobile/desktop rollout and operational regression. Dashboard slices should ship with their corresponding working module, not wait until the end or display pretend data.

These phases sequence the requested comprehensive scope; they do not remove later modules. No release date, price, installed-tool promise, autonomous response promise or production readiness claim is made here.
