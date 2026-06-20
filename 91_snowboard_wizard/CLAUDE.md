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

## Implementation plans

See `docs/superpowers/plans/2026-06-20-snowboard-wizard-plan-*.md` for the phased build plans.
