# Ardi — full project handoff

Written at the end of a long session, at the user's explicit request, because they do not want this Claude session touching the project further. This is meant to be complete enough that anyone — a person or a fresh AI session — can pick this up cold with zero prior context. Everything below reflects real, verified state as of this writing; nothing here is guessed.

---

## 1. What Ardi is

Ardi is an autonomous penetration-testing SaaS. A customer registers systems they own ("assets"), Ardi scans them for real vulnerabilities, maps findings to MITRE ATT&CK, and produces reports. It is a monorepo: Express API + Postgres/Drizzle backend, React/Vite frontend, a real scan engine (nmap + nuclei, with an optional CyberStrike engine), and an in-app AI assistant called ARDI (also the name of the product's robot mascot character).

Repo: `github.com/iamardiblackhat/Ardi-Pen-Test`, branch `main`. This machine's local clone is at `/Users/aaronaccount/Desktop/Ardi-Pen-Test`.

## 2. Repo layout

```
artifacts/
  api-server/    Express 5 API, mounted at /api
  ardi/          Main web app (React 19 + Vite + Tailwind v4)
  ardi-ds/       Design system / token source of truth (tokens.json)
  mockup-sandbox/  UI prototyping sandbox, not customer-facing
lib/
  api-spec/      openapi.yaml — the API contract; Orval generates hooks/schemas from it
  api-client-react/  Generated TanStack Query hooks (don't hand-edit generated/)
  api-zod/       Generated Zod schemas (don't hand-edit generated/)
  db/            Drizzle schema + client
  scan-engine/   Real nmap/nuclei runners and parsers
  ardi/          The ARDI assistant agent (lib/ardi — package name @workspace/ardi-agent)
  threat-intel/  OpenCTI GraphQL client + STIX export (optional, unconfigured)
deploy/          Caddyfile, systemd unit, VM provisioning scripts — the real (non-Vercel) deploy path
```

Package manager is pnpm only (`preinstall` hook rejects npm/yarn). `pnpm run build` at the root builds everything.

## 3. Infrastructure — where things actually run

- **Production VM**: instance `ardiclaw-mix`, GCP project `vm-engine-503721`, zone `europe-west1-b`, external IP `34.156.165.60`. This VM was originally provisioned for a different, unrelated project the user calls "ARDI Claw" (never deployed there); Ardi ended up on it instead. It does **not** match the naming (`ardi-platform`) or zone (`europe-west2-c`) that `deploy/provision-vm.sh` would create by default — it was set up some other way.
  - SSH: `gcloud compute ssh ardiclaw-mix --project vm-engine-503721 --zone europe-west1-b --tunnel-through-iap`
  - Runs: `ardi-api.service` (systemd, Node, `/opt/ardi/artifacts/api-server/dist/index.mjs`) + Caddy (reverse proxy + static frontend) + local Postgres.
  - App code lives at `/opt/ardi`, owned by user `aaronaccount`. Deployed by tarball + scp, **not** git pull (see §5).
  - **No HTTPS** — Caddy is only listening on port 80. The deployed `Caddyfile` uses a bare `:80 {}` block with no real hostname, so Caddy has nothing to request a Let's Encrypt cert for. Needs a real domain pointed at `34.156.165.60`, then the Caddyfile updated with that hostname, before this is real production-grade.
  - DB: local Postgres on the VM, database `ardi`. As of last check, **zero rows in `users`/`assets`** — nothing has ever been live-used by a real customer.
- **Interim frontend**: Vercel project `ardi-pen-test-api-server` (name is stale/misleading — it was originally set up to deploy the API, now serves the frontend instead), under Vercel team/org `ardi-ai-security`, account `aaronardii-8084`.
  - Live URL: **https://ardi-pen-test-api-server-one.vercel.app**
  - `vercel.json` at repo root: builds `artifacts/ardi` (the frontend) and rewrites `/api/*` to `http://34.156.165.60/api/*` — i.e. Vercel serves static frontend, all API calls proxy through to the real VM backend. This is explicitly an **interim** setup while the user secures a real domain.
  - The Vercel *project's own dashboard settings* previously had `framework: "express"` and `rootDirectory: "artifacts/api-server"` left over from its old purpose — these silently overrode `vercel.json` and caused every deploy to fail. Both were cleared via the Vercel API (`PATCH /v9/projects/{id}` with `framework: null, rootDirectory: null`) — if deploys start mysteriously failing again, check the dashboard Project Settings → Build & Development Settings for a re-added override before assuming the code is broken.
  - Redeploy command (must use `--archive=tgz`, plain `--prod --yes` fails — this monorepo has more files than the CLI's default upload will accept): `vercel --prod --yes --archive=tgz` from repo root. Vercel CLI is authenticated already on this Mac (`~/Library/Application Support/com.vercel.cli/auth.json`).
- **VM deploy process** (manual, no CI):
  ```
  tar --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='.DS_Store' \
      --exclude='._*' --exclude='.claude' --exclude='.agents' --exclude='.canvas' \
      --exclude='.config' --exclude='.local' --exclude='*.tsbuildinfo' --exclude='.turbo' \
      -czf /tmp/ardi-deploy.tar.gz .
  gcloud compute scp /tmp/ardi-deploy.tar.gz ardiclaw-mix:/tmp/ardi-deploy.tar.gz \
      --project vm-engine-503721 --zone europe-west1-b --tunnel-through-iap
  # then SSH in and:
  cd /opt/ardi && tar -xzf /tmp/ardi-deploy.tar.gz && rm -f /tmp/ardi-deploy.tar.gz
  find /opt/ardi -maxdepth 2 -name '._*' -delete   # macOS AppleDouble junk from tar
  pnpm install --frozen-lockfile
  sudo rm -rf artifacts/ardi/dist && sudo chown -R aaronaccount:aaronaccount /opt/ardi  # only if a prior deploy left root/ardi-owned files
  pnpm run build
  sudo chmod -R a+rX /opt/ardi/artifacts /opt/ardi/lib /opt/ardi/node_modules
  sudo systemctl restart ardi-api
  ```
- **Local dev DB** (this Mac, not the VM): Postgres, database `ardi`, connect as `postgresql://aaronaccount@localhost:5432/ardi` (no password, local trust auth). Used for local `pnpm --filter @workspace/db run push` schema testing before pushing the same migration to the VM's DB.
- **`.env` files**: never committed (gitignored, correctly). The VM's real `/opt/ardi/.env` and this Mac's local dev env vars are the only copies. `deploy/.env.example` is the template — kept reasonably in sync with what the code actually reads, but **`ANTHROPIC_API_KEY` (or `ARDI_BASE_URL`+`ARDI_MODEL` for a local model) has never been set anywhere** — see §7.

## 4. Security status — what's real now

A full production-readiness audit ran this session (parallel agents across backend/frontend/lib/deploy/repo-hygiene) and every finding it surfaced was fixed, verified by typecheck + build, and smoke-tested against a live Postgres with real HTTP requests (not just "looks right"):

- **Multi-tenancy / IDOR — fixed.** Previously, zero tables had any owner column; any registered user could read, edit, and delete any other user's assets/scans/findings by guessing an ID. Every table (`assets`, `scans`, `findings`, `reports`, `activity`) now has a `userId` column, every route filters and writes by the authenticated caller's own ID (verified live: two separate accounts, confirmed cross-account access returns 404/empty, not data). ARDI's own tools (which query the same tables) are scoped the same way.
- **`/api/ardi/chat` auth bug — fixed.** It was accidentally sitting behind the global auth gate, so the anonymous landing-page chat would have 401'd for every visitor — the opposite of its purpose. Split into an authenticated path (real per-user tools) and a public path (no tools, general product Q&A only).
- **Auth rate limiting** added on `/api/auth/login` and `/register` (verified: 429 after the 10th attempt in a window).
- **Global JSON error handler** added (Express 5's default would otherwise leak stack traces / return HTML).
- **CORS** now fails loud at boot if `CORS_ORIGIN` is unset in production, instead of silently reflecting any origin.
- **Asset deletion** now blocked if the asset has scan history, instead of silently orphaning findings — this also matters for the "prove we weren't complicit" audit-trail concern the user raised (see §8, CyberStrike).
- **Scan creation** validates the target asset actually exists (previously a bad ID created a scan stuck at "pending" forever with no error).
- A hardcoded fake API key that was shown to *every* user as if it were their real credential (in Settings) — **removed**, replaced with a real profile-update endpoint (`PATCH /api/auth/me`) that actually persists name/org/notification preferences.
- Dozens of dead buttons (no `onClick`/`href`), 36 unused UI component files, a duplicated ARDI chat panel implementation, fabricated "6 assets under test"-style stats, and a fake CLI mockup that implied a command-line tool exists (it doesn't) — all removed or fixed. See git log for `fix: production-readiness pass` and later commits for exact detail.

**What's still real vs not, for anyone evaluating this codebase:**
- The scanner is genuinely real. `scan-runner.ts` actually shells out to `nmap`/`nuclei` (via `execFile`, never a shell, with an allowlist target validator that blocks command injection and SSRF into private IP ranges) and writes real findings. The README used to claim the opposite ("scanner is not built yet") — that was stale and has been corrected.
- Compliance framework scores (SOC2/PCI/ISO/HIPAA) and the dashboard's compliance percentage are **still static sample data**, now honestly labeled as such in the UI, but not computed from real findings. Building the real thing is unstarted.
- Report generation creates a database record but does **not** generate an actual downloadable file yet (the Download button was removed rather than link to something that 404s).

## 5. What was NOT touched — the biggest remaining gap

**Only the landing page, login, and register pages were visually redesigned this session.** The entire authenticated app — dashboard, assets, scans, findings, settings, compliance, MITRE pages — is still on the **old light/cream theme** with the original generic styling. The user has flagged the visual quality repeatedly and with escalating frustration; this is unfinished, not forgotten. If picking this back up, this is almost certainly priority one.

### Design direction established this session (read before touching any UI)

The user pointed at three real references and asked for a synthesis, not a copy: `cyberstrike.io` (bold gradient headline energy), the actual OpenCTI dashboard screenshot from `OpenCTI-Platform/opencti`'s GitHub README (dense, near-black, functional not decorative color, big-number-plus-delta stat pattern), and `filigran.io` (near-black canvas, system-diagram-as-hero-art, glowing outline-pill buttons, real page-load motion). Hard rules that came out of repeated, sharp correction over the course of this session — violating any of these will visibly repeat mistakes already made and corrected once:

1. **No fabricated numbers or stats, ever** — not "6 assets under test," not illustrative usage counts, nothing presented as data that isn't real. Real reference data (e.g. the actual MITRE ATT&CK tactic list) is fine; invented per-account numbers are not.
2. **No fake CLI, no assuming technical literacy.** No terminal-command mockups implying a CLI tool exists (it doesn't) — the product's own audience includes non-technical users (its own ARDI system prompt explicitly anticipates "an office manager who has never read a CVE"). Show real UI (forms, buttons).
3. **Every card-like element must be genuinely interactive** — click it and something real happens (expands, reveals real detail, navigates). Static decorative cards were called out repeatedly as unacceptable.
4. **Don't wrap product visuals in a fake "browser window" screenshot frame.** The user explicitly rejected this — the actual page content itself should carry the visual quality; don't fake a screenshot of a screenshot.
5. **The landing/marketing pages should look and behave like a normal marketing site** (hero, features, pricing, footer) with the *visual quality/theme/layout* matching the references — not literally turn into an embedded dashboard app.
6. **Design tokens already exist — use them, don't reinvent.** `artifacts/ardi-ds/tokens.json` is the source of truth; `artifacts/ardi/src/index.css` already has a full severity color ramp (`--color-severity-critical/high/medium/low/info`, usable directly as Tailwind classes like `bg-severity-critical`), Space Grotesk (display) + JetBrains Mono (code/data) already loaded via Google Fonts, and reusable utility classes `.glow-primary`, `.glow-primary-strong`, `.grid-pattern`, `.animate-pulse-glow` already defined. The old landing page simply wasn't using any of this.

### Open, unresolved visual issue: the ARDI mascot artwork itself

The character renders (`artifacts/ardi/public/ardi/*.jpg` — idle/working/celebrating poses) have real problems that are baked into the source images, not fixable with CSS:
- Stray glowing particle artifacts near the hands that look like AI-generation noise, not an intentional effect.
- Generic "AI-generated 3D mascot" look overall.

Two CSS-level bugs in how these renders were *displayed* were found and fixed this session (`artifacts/ardi/src/components/ardi-avatar.tsx`, commit `cdfe6ab`): the head was being cropped because a `transform: scale()` was anchored at the element center (zooming into the chest logo) instead of the top edge; and the images' baked-in flat-black backdrop showed as a visibly mismatched dark circle against the app's navy (not pure black) dark theme, fixed with `mix-blend-screen` so the black drops out against whatever's actually behind it. **Both fixes are committed and pushed to `main` (commit `cdfe6ab`) but were not yet confirmed redeployed to Vercel/the VM when this session ended** — verify the live sites actually reflect this commit before assuming it's live.

The deeper artwork-quality problem (particle artifacts, generic look) is **unresolved**. The user was firm: **do not generate a new/different mascot character** — it must remain the same robot, cleaned up, not redesigned. That requires image *editing* capability (input the existing image, remove the artifacts, keep everything else identical), not text-to-image generation from scratch. An attempt to use `belt`/inference.sh's Gemini image tool this session failed — the account has $0.00 balance (min. $0.50 required) and no purchase was made without explicit permission. No other already-funded image-editing path was found on this machine (checked: no `OPENAI_API_KEY`/`GEMINI_API_KEY`/`GOOGLE_API_KEY`/`STABILITY_API_KEY`/`REPLICATE_API` env vars set; `gcloud auth list` shows two Google accounts logged in but that doesn't imply a funded Vertex AI image API). **This is genuinely blocked on the user either funding the inference.sh account or providing another already-paid image-editing credential/tool.**

## 6. ARDI (the AI assistant) — capability status

- Backend (`lib/ardi`, package `@workspace/ardi-agent`) is real and provider-agnostic: Anthropic API by default, or any OpenAI-compatible local server (`ARDI_PROVIDER=openai-compat` + `ARDI_BASE_URL`) for zero-cost/local/private operation. **Never configured with a real key anywhere** — this is why ARDI has appeared completely non-functional the entire time the user has been testing it. First thing to fix if ARDI needs to actually work: put `ANTHROPIC_API_KEY=...` (or the local-model vars) in `/opt/ardi/.env` on the VM and restart `ardi-api`.
- Tools are read-only by design: `list_findings`, `get_finding`, `list_assets`, `list_scans`, `get_security_summary` — all now scoped per-user (§4). No mutation tools exist yet; the type system (`confirmBeforeRunning` on `VerticalConfig`, the unused `confirm_required` SSE event type) already anticipates a future propose→confirm→apply flow for anything that changes data, but none of that is built.
- A full design for giving ARDI navigation capability exists (produced by a background research agent this session): a `navigate_to` tool resolved through a closed server-side route enum (not a raw string, to close a prompt-injection path), a new `navigate` SSE event type, frontend wiring via wouter's `useLocation()`, and a cheap non-model-call proactive greeting computed from real open-finding counts. **Design only — nothing implemented.**
- The public/anonymous landing-page chat (`cyberPublicVertical`) has no tools and a different, marketing-appropriate system prompt — this split was added this session as part of fixing the auth bug above.

## 7. External integrations — status and decisions needed

- **SumUp (payments)** — user's explicit choice over Stripe. **Nothing built.** No credentials given ("we don't need that right now, we're still building" — user's own words, said mid-session). When resumed: confirm SumUp's API actually supports recurring subscription billing the way needed (it's primarily a card-present/checkout API; this was flagged as worth confirming before designing against it), then scaffold a real integration — never a fake/mock payment UI.
- **CyberStrike (premium scan engine)** — the adapter in this repo (`artifacts/api-server/src/lib/cyberstrike.ts`) is code-complete and was confirmed, by actually visiting the real project, to correctly match `cyberstrike.io` / `github.com/CyberStrikeus/CyberStrike` (an open-source AI-agent-driven pentest tool — confirmed to already be installed on this Mac at `~/.local/bin/cyberstrike`, v1.1.14, not currently running). **Important: that project is licensed AGPL-3.0-only.** Since the plan is to charge a premium price for CyberStrike-powered scans, this needs either a commercial license (`contact@cyberstrike.io` offers one explicitly) or a deliberate, informed decision to operate under AGPL's network-use source-availability obligation. Not resolved. Separately: the user also has an unrelated, different Go-based project called "CyberStrikeAI" on this machine (`~/Claude/ClaudeProjects/CyberStrikeAI`) — confirmed **not** related to `cyberstrike.io` and explicitly not wanted here; don't confuse the two.
- **OpenCTI (threat intel)** — real GraphQL client already exists (`lib/threat-intel`), confirmed to target the real, official `OpenCTI-Platform/opencti` project. License is Apache-2.0 for the Community Edition — no licensing concern. **Not deployed anywhere.** Standard deployment is docker-compose (Elasticsearch + RabbitMQ + Redis + MinIO + the app) — realistic sizing found by research: ~4 vCPU / 16GB RAM / 80-100GB disk, should run on its own separate VM from the main Ardi app (resource mismatch + the abuse-report isolation reasoning already used for the scan worker in `deploy/provision-vm.sh`). A full deployment plan exists from a background research agent this session if picked back up.
- **OpenAEV (adversary/breach simulation — the actual "engine" in Filigran's product family, separate from OpenCTI)** — Apache-2.0, no license concern. **No integration code exists at all** (unlike OpenCTI). REST API (not GraphQL), needs a hand-rolled client analogous to the OpenCTI one. A deployment + integration-shape plan exists from a background research agent this session.
- **User's hard rule: never install/run Docker on their own Mac** (past bad experiences, disk usage) — **Docker on a remote server is completely fine.** This governs where OpenCTI/OpenAEV get deployed (their own remote VM(s), never locally).

## 8. Everything committed and where

All work described above is committed to `main` and pushed to GitHub. Relevant commits, most recent first:
- `cdfe6ab` — ARDI avatar crop + background-blend fix (see §5). **Deployment to Vercel/VM not confirmed before session end.**
- `18ef40e` — landing/login/register redesign (dark theme, MITRE ATT&CK interactive panel, real form mockups, click-to-expand feature cards). Confirmed deployed to both Vercel and the VM.
- `4427a41` — the full production-readiness pass described in §4. Confirmed deployed to both Vercel and the VM, smoke-tested live.

Working tree is clean (nothing uncommitted) as of this document being written.

## 9. Suggested priority order if/when resumed

1. Confirm `cdfe6ab` (avatar fix) is actually live on both Vercel and the VM — it was committed but the deploy step wasn't confirmed before this session was told to stop.
2. Resolve the mascot artwork problem (fund an image-editing tool, or the user does the edit themselves) — it's the most recent, most emotionally charged open item.
3. Extend the dark-theme redesign to the rest of the authenticated app (dashboard, assets, scans, findings, settings) — the single largest piece of unfinished, repeatedly-requested work.
4. Set `ANTHROPIC_API_KEY` so ARDI actually responds to anything — cheap, high-impact, currently completely broken.
5. Build real Terms & Conditions / Privacy Policy pages (explicitly requested, currently don't exist).
6. Everything in §7, roughly in the order listed (OpenCTI/OpenAEV have no licensing blockers and could proceed anytime; SumUp and CyberStrike both need a decision/input from the user first).
