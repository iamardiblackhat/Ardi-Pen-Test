# Ardi

Ardi is an autonomous penetration testing platform. It tracks the assets you are
authorized to test, records scans against them, and stores the findings those
scans produce — with severity, CVE/CVSS metadata, MITRE ATT&CK mapping,
remediation notes, and compliance-framework rollups.

> **Status: the scanner is real, but the platform is single-tenant.** Starting a
> scan genuinely runs `nmap`/`nuclei` (or a CyberStrike engine, if configured)
> against the target and writes back real findings — see
> `artifacts/api-server/src/lib/scan-runner.ts`. What is **not** yet true: no
> table or query in the API is scoped by user or organization, so any
> registered account can currently read and edit any other account's assets,
> scans, and findings. Do not put a second paying customer on this deployment
> until that's fixed. Compliance framework scores and the dashboard's
> compliance percentage are also still static sample data, not computed from
> real findings.

## Stack

- **Monorepo:** pnpm workspaces, Node.js 24, TypeScript 5.9
- **API:** Express 5, with `pino` / `pino-http` for logging, bundled to a single
  ESM file with esbuild
- **Database:** PostgreSQL with Drizzle ORM (`drizzle-kit` for schema push)
- **Validation:** Zod, plus `drizzle-zod` for schema-derived types
- **API contract:** OpenAPI spec at `lib/api-spec/openapi.yaml`, with Orval
  generating the TanStack Query React hooks and the Zod request/response schemas
- **Frontend:** React 19 + Vite 7 + Tailwind CSS 4, Radix UI / shadcn components,
  `wouter` for routing

## Layout

```
artifacts/
  api-server/       Express 5 API, mounted at /api
  ardi/             Main web app (React + Vite)
  ardi-ds/          Design system + living style guide, tokens.json is the source of truth
  mockup-sandbox/   UI prototyping sandbox with an infinite canvas
lib/
  api-spec/         openapi.yaml + Orval config — the API source of truth
  api-client-react/ Generated TanStack Query hooks (do not edit generated/)
  api-zod/          Generated Zod schemas (do not edit generated/)
  db/               Drizzle schema and client
  threat-intel/     OpenCTI / STIX types and helpers
scripts/            Workspace utility scripts
```

`lib/api-client-react/src/generated` and `lib/api-zod/src/generated` are produced
by Orval. Edit `lib/api-spec/openapi.yaml` and re-run codegen instead of editing
them by hand.

## Requirements

- Node.js 24
- pnpm 11 (the `preinstall` hook rejects npm and yarn)
- A PostgreSQL database

Set `DATABASE_URL` to your Postgres connection string before running the API
server or pushing schema changes.

## Commands

Install first:

```sh
pnpm install
```

| Command | What it does |
| --- | --- |
| `pnpm --filter @workspace/api-server run dev` | Build and run the API server (port 8080) |
| `pnpm --filter @workspace/ardi run dev` | Run the Ardi web app (port 5173) |
| `pnpm --filter @workspace/ardi-ds run dev` | Run the design system style guide (port 5174) |
| `pnpm --filter @workspace/mockup-sandbox run dev` | Run the mockup sandbox (port 8081) |
| `pnpm run typecheck` | Typecheck every package |
| `pnpm run build` | Typecheck, then build every package |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks and Zod schemas from `openapi.yaml` |
| `pnpm --filter @workspace/db run push` | Push Drizzle schema changes to the database (dev only) |
| `pnpm --filter @workspace/ardi-ds run tokens` | Rebuild design tokens from `tokens.json` |

Each artifact also has `build` and `serve` (Vite preview) scripts, and the API
server has `build` and `start`.

## Local development and the `/api` proxy

The frontend calls the API with relative paths (`/api/...`), because Orval is
configured with `baseUrl: "/api"`. In development, `artifacts/ardi/vite.config.ts`
proxies `/api` to `http://localhost:8080`, so run the API server alongside the
web app:

```sh
pnpm --filter @workspace/api-server run dev   # terminal 1 — port 8080
pnpm --filter @workspace/ardi run dev         # terminal 2 — port 5173
```

Override the proxy target with `API_PROXY_TARGET` if the API runs elsewhere.

In production, whatever fronts the app must route `/api/*` to the API server —
the frontend has no absolute API base URL.

## Configuration

| Variable | Used by | Default |
| --- | --- | --- |
| `DATABASE_URL` | api-server, db | required |
| `PORT` | api-server | 8080 |
| `PORT` | each Vite artifact | 5173 (ardi), 5174 (ardi-ds), 8081 (mockup-sandbox) |
| `BASE_PATH` | each Vite artifact | `/` (ardi, ardi-ds), `/__mockup` (mockup-sandbox) |
| `API_PROXY_TARGET` | ardi dev server | `http://localhost:8080` |
| `NODE_ENV` | api-server, artifacts | — |

## API surface

All routes are mounted under `/api` (see `lib/api-spec/openapi.yaml` for the
full contract):

- `GET /api/healthz` — health check
- `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- `/api/assets` — CRUD plus `/api/assets/stats`
- `/api/scans` — list/create/read, `start`, `stop`, and `/scans/{id}/findings`
- `/api/findings` — list/read/update, plus `/findings/stats` and
  `/findings/mitre-coverage`
- `/api/reports` — list/create/read
- `/api/compliance/frameworks` and `/api/compliance/summary`
- `/api/dashboard/stats`, `/activity`, `/findings-by-severity`, `/scan-trend`

## Supply-chain policy

`pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`, so a package version must
have been public for at least a day before pnpm will install it. Do not disable
it. If you genuinely need a newer release, add the specific package to
`minimumReleaseAgeExclude` and remove the entry once the window has passed.
