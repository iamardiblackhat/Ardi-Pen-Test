# Ardi — session handoff

Working notes for whoever picks this up next (human or Claude), so nothing gets lost if the session cuts off. Delete this file once it's stale — it's not meant to be permanent docs.

## Infrastructure — where things actually live

- **Production VM**: `ardiclaw-mix`, GCP project `vm-engine-503721`, zone `europe-west1-b`, external IP `34.156.165.60`. SSH: `gcloud compute ssh ardiclaw-mix --project vm-engine-503721 --zone europe-west1-b --tunnel-through-iap`. Runs `ardi-api.service` (systemd) + Caddy (port 80 only, **no HTTPS yet** — needs a real domain pointed at the IP before Caddy can get a cert) + local Postgres. App lives at `/opt/ardi`, owned by `aaronaccount`.
- **Interim frontend**: Vercel project `ardi-pen-test-api-server` (misleadingly named — it now serves the frontend, not the API), org `ardi-ai-security`, account `aaronardii-8084`. Live at **https://ardi-pen-test-api-server-one.vercel.app**. `vercel.json` at repo root builds `artifacts/ardi` and rewrites `/api/*` to the VM's IP. Redeploy with `vercel --prod --yes --archive=tgz` from repo root (plain `--prod --yes` fails on this monorepo's file count).
- **GitHub**: `github.com/iamardiblackhat/Ardi-Pen-Test`, branch `main`. This is what the Vercel project is (presumably) tracking via git integration, and it's also the deploy source for the VM (rsync/scp a tarball, not git pull — see below).
- **VM deploy process** (no CI yet — manual): tar the repo excluding `node_modules/.git/dist/.claude/.agents/.canvas/.config/.local`, `gcloud compute scp` it to `/tmp/ardi-deploy.tar.gz`, SSH in, extract over `/opt/ardi`, `pnpm install --frozen-lockfile`, `pnpm run build`, `sudo systemctl restart ardi-api`. Fix perms with `sudo chown -R aaronaccount:aaronaccount /opt/ardi` if a prior deploy left root/ardi-owned files blocking the build.
- **Local dev DB**: Postgres on this Mac, database `ardi`, connect as `postgresql://aaronaccount@localhost:5432/ardi` (no password, local trust auth).

## What's done this session

1. **Full production-readiness audit + fixes** (multi-tenancy/IDOR fix — every table now scopes by `userId`, dead UI removed, backend hardening, fake data labeled honest, dead code deleted). All committed and deployed to both the VM and Vercel.
2. **Visual redesign of the public landing page** (`artifacts/ardi/src/pages/landing.tsx`), still in progress — see below. Dark theme, MITRE ATT&CK interactive tab, real form mockup instead of a fake CLI, click-to-expand feature cards. `login.tsx` restyled to match; `register.tsx` still needs the same treatment (was next on the list).
3. Design tokens already existed in `artifacts/ardi/src/index.css` (severity color ramp, Space Grotesk + JetBrains Mono fonts, `.glow-primary`/`.grid-pattern` utility classes) — reused, not reinvented.

## What's NOT done yet — pick up here

- **`register.tsx` still has the old light theme** — same treatment as `login.tsx` (dark wrapper, radial gradient, glow button). Quick.
- **The rest of the authenticated app** (dashboard, assets, scans, findings, settings, etc.) is still the **old light/cream theme** — this whole redesign pass has only touched landing/login so far. User has flagged this repeatedly as still looking generic. This is the largest remaining chunk of work if they want the whole app consistent.
- **Terms & Conditions / Privacy Policy pages** — user explicitly asked for these. They don't exist at all right now (the footer links to them were removed earlier this session for pointing nowhere — now need to actually build real pages, not just links).
- **Landing page build not yet verified/deployed after the latest round of edits** (ProductPanel tabs, FeatureGrid, form mockup) — typecheck is clean but **run `pnpm --filter @workspace/ardi run build` and redeploy to both Vercel and the VM** before considering this done.
- **SumUp payments** — user wants this as the payment provider (not Stripe). No credentials given yet ("we don't need that right now, we're still building" — user's words). Nothing built. When ready: scaffold real integration, no fake/mock payment UI.
- **CyberStrike licensing decision** — the CyberStrike engine adapter (`artifacts/api-server/src/lib/cyberstrike.ts`) is code-complete and correct (confirmed it matches the real `cyberstrike.io` / `CyberStrikeus/CyberStrike` open-source project, AGPL-3.0). Not yet activated as a paid feature — user needs to either get a commercial license from `contact@cyberstrike.io` or knowingly accept AGPL's source-availability obligation before charging for it.
- **OpenCTI deployment** — Apache-2.0, no licensing issue. Client code already exists (`lib/threat-intel`). Needs a real instance deployed (Docker is fine on a remote server, just never the user's own Mac — see memory note). Not deployed anywhere yet.
- **OpenAEV integration** — Apache-2.0. Nothing built yet (no client code exists, unlike OpenCTI). Needs both a deployment and new integration code.
- **ARDI's navigation/greeting capability** — a full design for this exists (a background agent produced it: `navigate_to` tool + new SSE event type + frontend wiring, plus a no-model-call proactive greeting). Not implemented yet.
- **`ANTHROPIC_API_KEY` still not set anywhere** — ARDI (the in-app assistant) has been non-functional this whole session because of this. Needs to go in `/opt/ardi/.env` on the VM (and locally for dev) before ARDI will respond to anything.

## Design direction (for whoever touches the UI next)

User wants Ardi's look inspired by (not copied from) three real references they pointed at: `cyberstrike.io` (bold gradient headlines), the real OpenCTI dashboard screenshot in their GitHub README (dense, near-black, big-number-plus-delta stats, functional not decorative color), and `filigran.io` (near-black canvas, system-diagram-as-hero-art, glowing outline-pill buttons). Hard rules that came out of repeated feedback this session:

- **No fabricated numbers/stats, ever** — not even as an illustrative "mockup convention." If it's not real (a live count, a real user's data), don't show a specific number.
- **No fake CLI / no assuming technical literacy** — the product's own audience includes non-technical users. Show real UI (forms, buttons), not terminal commands, unless a CLI genuinely exists (it doesn't).
- **Every card-like element must be genuinely interactive** — click it and something real happens (expands, reveals detail, navigates). Static decorative cards are exactly what's been rejected repeatedly.
