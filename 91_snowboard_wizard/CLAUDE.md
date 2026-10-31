# CLAUDE.md — 91_snowboard_wizard

This subproject does **not** follow the numbered lab conventions documented in the repo-root `CLAUDE.md`.

## Key differences

- TypeScript / Node.js (not Python)
- Turborepo pnpm monorepo (not a single `main.py` entry point)
- No `manage.py`, `config.py`, or `data.py` — those are lab-specific patterns
- No prompt `.txt` files — prompts are passed via the Claude API from NestJS service code
- `packages/wizard-schema` is the single source of truth for questions, branching rules, and scoring; never duplicate schema in app code

## Structure

```
apps/web/     Next.js 14 (App Router)
apps/api/     NestJS
packages/types/          Shared TypeScript interfaces
packages/wizard-schema/  Questions, rules, scoring thresholds
packages/ui/             shadcn/ui component library (reskinned)
```

## Running locally

```bash
pnpm install
pnpm turbo build
pnpm turbo test
docker compose up   # starts web + api + postgres + redis
```

## Local development with Podman

The project uses **Podman + podman-compose** (no Docker required):

```bash
# Start the full dev stack with live reload
podman compose up

# Rebuild after adding a new npm dependency
podman compose up --build api

# Force-recreate a specific service (e.g. after changing consul config)
podman compose up -d --force-recreate consul-server
```

**Live reload caveat (macOS + Podman):** `apps/api/src` is bind-mounted into the API container and `nest start --watch` runs inside it, but Podman's macOS VM does **not** forward inotify events from the host. The watcher never fires on file saves. After editing source files, restart the container process to trigger a fresh compilation:

```bash
podman restart 91_snowboard_wizard_api_1
```

`podman compose restart api` does the same thing but may be slower. `podman compose up -d api` recreates the container and also works, but picks up the pre-built dist from the image layer on first boot — use `podman restart` to guarantee a clean recompile from the bind-mounted source.

**Dev image vs prod image:**
- `infra/docker/Dockerfile.api.dev` — dev image (runs `nest start --watch`, all devDeps installed)
- `infra/docker/Dockerfile.api` — prod image (pre-built dist, devDeps pruned)
- `docker-compose.override.yml` auto-selects the dev image and mounts source

## Infrastructure services

| Service | Port | Purpose |
|---------|------|---------|
| api | 3001 | NestJS API |
| postgres | 5432 | PostgreSQL 16 |
| redis | 6379 | Redis 7 |
| consul-server | 8500 | Service mesh UI + discovery |
| prometheus | 9090 | Metrics scraping |
| postgres-exporter | 9187 | PostgreSQL metrics for Prometheus |
| redis-exporter | 9121 | Redis metrics for Prometheus |
| pgAdmin | 5050 | PostgreSQL UI (dev override only) |
| RedisInsight | 5540 | Redis UI (dev override only) |

**Consul:** All services are registered via `infra/consul/services.json`. Consul health-checks the API at `GET /api/health` every 10 s. The UI config in `infra/consul/ui.json` wires Prometheus as the metrics provider.

**Prometheus:** Discovers services via Consul SD (`infra/prometheus/prometheus.yml`). Scrapes `/metrics` on all registered services.

**API metrics:** Exposed at `GET /metrics` (outside the `/api` prefix) via `@willsoto/nestjs-prometheus`. Default Node.js process metrics are collected automatically.

## Environment variables

Copy `.env.example` to `.env` and fill in real values. Compose loads `.env` automatically for both variable substitution in the compose files and injection into the `api` container.

| Variable | Required | Notes |
|----------|----------|-------|
| `POSTGRES_USER` | no | default `wizard` |
| `POSTGRES_PASSWORD` | no | default `wizard` |
| `POSTGRES_DB` | no | default `wizard` |
| `DATABASE_URL` | no | derived from the three above by default |
| `REDIS_URL` | no | default `redis://localhost:6379` |
| `JWT_SECRET` | yes | min 32 chars |
| `ANTHROPIC_API_KEY` | yes | checked by `GET /api/health` |
| `GOOGLE_CLIENT_ID` | yes | checked by `GET /api/health` |
| `ALLOWED_ORIGINS` | no | comma-separated, default `http://localhost:3000` |

## API health check

`GET /api/health` reports connectivity for all four runtime dependencies:

```json
{
  "status": "ok",
  "checks": {
    "postgresql": { "status": "ok" },
    "redis":      { "status": "ok" },
    "anthropic":  { "status": "ok" },
    "google":     { "status": "ok" }
  }
}
```

- Returns **200** when PostgreSQL and Redis are reachable (Consul uses this as the liveness gate).
- Returns **503** when either core dependency is down.
- `anthropic`: validates `ANTHROPIC_API_KEY` against `GET /v1/models`.
- `google`: validates `GOOGLE_CLIENT_ID` via a dummy token exchange — `invalid_grant` means the client ID is registered; `invalid_client` means it isn't.

## Testing

### Unit tests (Jest)

```bash
pnpm --filter @snowboard/api test
```

42 specs under `apps/api/src/**/*.spec.ts`.

### E2E tests (Cucumber.js 11 + Supertest)

```bash
pnpm --filter @snowboard/api test:e2e           # all non-@wip scenarios
pnpm --filter @snowboard/api test:e2e:smoke     # @smoke and not @wip
```

Config: `apps/api/cucumber.js` (CommonJS, `ts-node/register`, two profiles: `default` / `smoke`).

Layout:
```
apps/api/test/e2e/
  features/           14 .feature files, 61 Gherkin scenarios
    auth/             google-login, token-refresh, logout, me
    journeys/         guest-wizard-completion, authenticated-wizard-save-reload, session-claim-on-login
    recommendations/  create, retrieve, share, pdf
    health.feature    scoring.feature  sessions.feature
  step-definitions/   common, health, auth, scoring, sessions, recommendations
  support/            world.ts (ApiWorld), hooks.ts, fixtures.ts
```

**ApiWorld** (`test/e2e/support/world.ts`): custom Cucumber World holding `response`, `cookies`, `capturedValues`, `skipCsrfOrigin`. Reads `API_URL` (default `http://localhost:3001`) and `API_ORIGIN` (default `http://localhost:3000`).

All step bodies currently return `'pending'` — the framework is scaffolded; HTTP calls are not yet implemented.

**Tag strategy:** `@smoke` (happy-path gates), `@regression` (full suite), `@auth`, `@security`, `@journey`, `@wip` (excluded from default run).

## Implementation plans

See `docs/superpowers/plans/` in the repo root for the phased build plans and the Cucumber e2e plan:
- `2026-06-20-snowboard-wizard-plan-1-monorepo-schema.md`
- `2026-06-20-snowboard-wizard-plan-2-api.md`
- `2026-06-20-snowboard-wizard-cucumber-e2e.md`
