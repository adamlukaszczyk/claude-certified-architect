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

**Live reload:** `apps/api/src` is bind-mounted read-only into the API container. NestJS `nest start --watch` recompiles on every host file save — no manual container restart needed.

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

Postgres credentials are parameterized — set them in `.env.local` (loaded automatically by compose if present):

```bash
POSTGRES_USER=wizard       # default: wizard
POSTGRES_PASSWORD=wizard   # default: wizard
POSTGRES_DB=wizard         # default: wizard
```

## Implementation plans

See `docs/superpowers/plans/2026-06-20-snowboard-wizard-plan-*.md` for the phased build plans.
