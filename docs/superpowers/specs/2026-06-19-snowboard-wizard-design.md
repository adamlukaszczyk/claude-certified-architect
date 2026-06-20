# Snowboard Selection Wizard — Design Spec
**Date:** 2026-06-19
**Location:** `91_snowboard_wizard/`

---

## Overview

A production-grade web application that guides snowboarders through an adaptive wizard to select the right snowboard. Output is an educational recommendation + printable spec sheet. Users can optionally save their results via Google OAuth.

---

## 1. Repository Structure

Turborepo monorepo under `91_snowboard_wizard/`:

```
91_snowboard_wizard/
├── apps/
│   ├── web/                        # Next.js 14 (App Router, SSR)
│   └── api/                        # NestJS
├── packages/
│   ├── types/                      # Shared TypeScript interfaces
│   ├── wizard-schema/              # Question definitions, branching rules, scoring weights
│   │   ├── questions/              # YAML files per phase
│   │   ├── scoring/                # Score-to-spec threshold YAML files
│   │   └── src/
│   │       ├── rules.ts            # Named branching condition functions
│   │       └── types.ts            # Answers, PartialScores, SpecScores types
│   └── ui/                         # Shared component library (shadcn/ui reskinned)
├── infra/
│   ├── k8s/
│   │   ├── charts/web/
│   │   ├── charts/api/
│   │   └── values/
│   │       ├── values.prod.yaml
│   │       └── values.local.yaml
│   └── docker/
│       ├── Dockerfile.web
│       └── Dockerfile.api
├── docker-compose.yml              # Local: web + api + postgres + redis
├── turbo.json
└── package.json
```

**Key principle:** `packages/wizard-schema` is the single source of truth for every question, branching condition, and scoring weight. Both `apps/web` and `apps/api` import from it — no schema drift.

---

## 2. Wizard Domain Model & Branching Logic

### Phases

**Phase 1 — Rider Profile** (all users)
Height, weight, boot size, experience level (beginner / intermediate / advanced / expert), foot stance (regular / goofy), riding frequency (days/season).

**Phase 2 — Style & Terrain** (all users, questions adapt by experience level)
Primary riding style (freestyle / all-mountain / freeride / carving / powder / splitboard), terrain mix (% park / groomed / backcountry / trees), typical snow conditions (hardpack / powder / mixed / ice).

**Phase 3 — Deep Dive** (branched per style)
- Freestyle → park feature focus, switch riding frequency, preferred tricks
- Freeride/Powder → backcountry vs resort, touring needs, preferred taper feel
- Carving → preferred turn radius (short/medium/long arcs), edge aggression
- All-mountain → groomed/off-piste split, speed preference

**Phase 4 — Advanced Refinement** (opt-in, shown after initial recommendation)
Camber preference override, flex feel preference, torsional rigidity preference, base maintenance willingness, stance setback preference, budget range.

After Phase 3, the user receives their initial recommendation. A **Refine my answers** panel lets them revisit any question — re-scoring triggers instantly.

### Schema Architecture (Hybrid YAML + TypeScript Rules)

YAML owns question content, options, and weights. TypeScript owns branching logic.

**Question YAML format:**
```yaml
# packages/wizard-schema/questions/phase-3-powder.yaml
- id: taper_preference
  phase: 3
  text: "How surfy do you want your board to feel in powder?"
  showIf: isPowderFocused
  options:
    - id: low_taper
      text: "Stable and predictable"
      weights: { taper: -1, float: 0 }
    - id: mid_taper
      text: "Balanced float"
      weights: { taper: 0, float: 1 }
    - id: high_taper
      text: "Max float, surfy feel"
      weights: { taper: 2, float: 2 }
```

**Branching rules (full TypeScript, no restrictions):**
```typescript
// packages/wizard-schema/src/rules.ts
export const rules: Record<string, (a: Answers, s?: PartialScores) => boolean> = {
  isPowderFocused: (a) =>
    a.style === 'powder' || a.style === 'freeride',

  needsTaperQuestion: (a, s) =>
    (a.style === 'powder' || a.style === 'freeride') &&
    a.experience !== 'beginner' &&
    (s?.flex ?? 0) >= 5,

  splitboardCandidate: (a) =>
    a.style === 'freeride' &&
    a.terrain.backcountry > 60 &&
    a.ridingDays > 15,
}
```

**Zod validation at NestJS startup:** YAML is parsed and validated against a Zod schema that verifies all `showIf` values exist as keys in `rules.ts`. Invalid schema = server refuses to start.

### Comprehensive Factor Coverage

The wizard covers 70+ selection factors across:
- **Sizing:** weight (primary), height, boot size, waist width, board length
- **Shape:** directional, twin, directional-twin, tapered directional, specialty
- **Flex:** overall rating (1–10), flex distribution, flex point
- **Camber profiles:** traditional camber, rocker, flat, hybrid variants (CamRock, rocker-camber-rocker, flat-to-rocker)
- **Geometry:** sidecut radius, effective edge length, nose/tail width, taper ratio
- **Stance:** width, binding angles, setback (centered vs aggressive)
- **Construction:** core materials (poplar, paulownia, bamboo, carbon), base type (sintered vs extruded), torsional rigidity, damping
- **Terrain & conditions:** powder, hardpack, ice, slush, variable; resort vs backcountry; park vs trees
- **Riding style specifics:** freestyle tricks, carving arc preference, splitboard touring, powder float priority
- **Rider factors:** experience level, riding frequency, weight category, progression goals

---

## 3. Scoring & Recommendation Engine

Runs entirely in NestJS. Two stages.

### Stage 1 — Weighted Scoring (deterministic)

Each answer contributes points to independent spec categories:

```typescript
type SpecScores = {
  length: number    // → board length in cm
  width: number     // → waist width category
  flex: number      // → 1–10 flex rating
  shape: number     // → directional / twin / directional-twin / tapered
  camber: number    // → camber / rocker / hybrid / flat
  taper: number     // → mm taper ratio
  sidecut: number   // → short / medium / long radius
  setback: number   // → centered / slight / aggressive
  base: number      // → sintered / extruded
  float: number     // → powder float priority
}
```

Score-to-spec mapping uses threshold tables in editable YAML:

```yaml
# packages/wizard-schema/scoring/flex-mapping.yaml
- scoreRange: [0, 3]
  flex: 2
  label: "Soft"
  description: "Forgiving and playful, ideal for beginners and park riding"
- scoreRange: [4, 7]
  flex: 5
  label: "Medium"
  description: "Versatile for all-mountain riding in varied conditions"
- scoreRange: [8, 12]
  flex: 8
  label: "Stiff"
  description: "Responsive and stable at speed, for advanced riders"
```

Scoring runs **incrementally** — recalculates after each answer, powering the live profile sidebar.

### Stage 2 — Claude API (narrative + edge case handling)

After Stage 1 produces a concrete spec set, NestJS calls Claude with the rider profile and derived specs. Claude generates:
- 3–4 paragraph personalised explanation of why these specs fit this rider
- Trade-off awareness (what they sacrifice vs. what they gain)
- One alternative to consider if priorities shift
- Contradiction flags (e.g., beginner selecting expert terrain) surfaced as UI prompts

The spec sheet always comes from Stage 1 (fast, deterministic, no API dependency). Claude adds only the narrative layer.

---

## 4. Auth & User Accounts

**Flow:**
1. Wizard is fully usable as a guest — no login required to see recommendations
2. Result page shows a non-blocking **"Save your spec sheet"** prompt
3. Clicking triggers Google OAuth via NextAuth.js
4. NextAuth exchanges Google token → NestJS issues JWT stored in httpOnly cookie
5. Guest session is claimed and associated with the new user account on first login

**NestJS auth endpoints:**
- `POST /auth/google` — validates Google ID token, upserts user, returns JWT
- `GET /auth/me` — current user profile
- JWT PassportStrategy guard on all protected routes

**Security requirements:**
- NextAuth session cookie: httpOnly, SameSite=Lax (Strict breaks Google OAuth redirect callback), Secure in production
- State-changing endpoints require CSRF defence via origin header check (NextAuth default) — no custom double-submit needed when SameSite=Lax + HTTPS
- `share_token` must be cryptographically random (≥128 bits, `crypto.randomBytes(32).toString('base64url')`) — short slugs or sequential IDs are not acceptable
- Guest → user session claim must rotate the session identifier on privilege elevation to prevent session fixation

**User account features (POC scope):**
- Save named wizard sessions (e.g., "Park setup 2026", "Powder quiver")
- Reload and continue refining saved sessions
- Download spec sheet as PDF (`GET /api/recommendations/:id/pdf` via Puppeteer — isolated to a separate K8s Deployment with explicit memory/CPU limits due to Chromium footprint; not co-located with the main API pods)
- Share read-only recommendation URL (`/result/[share_token]`) — no auth required to view

*Post-POC extensions deferred by user decision.*

---

## 5. Data Model

PostgreSQL (RDS) with JSONB for variable wizard answer structures.

```sql
users
  id            uuid PRIMARY KEY
  google_id     text UNIQUE NOT NULL
  email       text UNIQUE NOT NULL
  name        text
  avatar_url  text
  created_at  timestamptz DEFAULT now()

wizard_sessions
  id             uuid PRIMARY KEY
  user_id        uuid REFERENCES users (nullable — guest sessions)
  name           text
  answers        jsonb NOT NULL         -- full branching answer set
  scores         jsonb                  -- computed SpecScores snapshot
  schema_version int NOT NULL DEFAULT 1 -- tracks question schema version for migration/replay
  phase_reached  int NOT NULL DEFAULT 1
  completed_at   timestamptz
  created_at     timestamptz DEFAULT now()
  updated_at     timestamptz DEFAULT now()

recommendations
  id               uuid PRIMARY KEY
  session_id       uuid REFERENCES wizard_sessions UNIQUE
  spec_sheet       jsonb NOT NULL       -- derived specs (length, flex, shape, etc.)
  claude_narrative text
  share_token      text UNIQUE NOT NULL
  created_at       timestamptz DEFAULT now()

refresh_tokens
  id          uuid PRIMARY KEY
  user_id     uuid REFERENCES users NOT NULL
  token_hash  text UNIQUE NOT NULL
  expires_at  timestamptz NOT NULL
  created_at  timestamptz DEFAULT now()
```

**Key decisions:**
- `answers` and `scores` as `jsonb` — handles variable branching without schema migrations per new question
- `user_id` nullable on `wizard_sessions` — guest sessions claimed on first login
- `share_token` on recommendations enables public links without exposing session internals
- `refresh_tokens` in DB (not Redis only) — enables cross-device revocation on logout
- **Redis serves three explicit purposes:** NextAuth session store, in-progress wizard answer cache (avoids a DB write on every step), rate limiting on Claude API calls

---

## 6. Infrastructure

### Local Development

```yaml
# docker-compose.yml
services:
  web:      # Next.js port 3000, hot reload
  api:      # NestJS port 3001, ts-node-dev watch
  postgres: # PostgreSQL 16
  redis:    # Redis 7
```

Single `docker-compose up` starts everything. Secrets via `.env.local` (gitignored).

### AWS Production (EKS)

```
EKS Cluster
├── Deployments
│   ├── web (Next.js)    — 2 replicas min, HPA on CPU
│   └── api (NestJS)     — 2 replicas min, HPA on CPU
├── ALB Ingress
│   └── HTTPS termination → /api/* to api service, /* to web service
└── Managed AWS Services
    ├── RDS PostgreSQL 16   — Multi-AZ, automated backups
    ├── ElastiCache Redis 7 — Single node (POC)
    ├── ECR                 — Container registry
    ├── ACM                 — SSL (auto-renewed)
    ├── Route 53            — DNS, ALB alias records
    └── Secrets Manager     — GOOGLE_CLIENT_ID, JWT_SECRET, ANTHROPIC_API_KEY
```

### Observability (AWS-native only)

| Concern | Service |
|---|---|
| Metrics & dashboards | CloudWatch Metrics |
| Distributed tracing | AWS X-Ray |
| Log aggregation | CloudWatch Logs (structured JSON) |
| Error alerting | CloudWatch Logs Insights + Alarms → SNS |

### CI/CD — GitHub Actions

```
push to main →
  1. Lint + typecheck (turbo)
  2. Unit tests (turbo)
  3. Build Docker images → push to ECR
  4. kubectl apply Helm charts → EKS
  5. TypeORM migrations (K8s Job, pre-deployment, forward-only — failed migration aborts deploy via Helm hook failure policy)
```

Helm chart structure:
```
infra/k8s/
├── charts/web/
├── charts/api/
└── values/
    ├── values.prod.yaml
    └── values.local.yaml
```

---

## 7. Frontend UX & Design System

### Visual Identity

**Mood:** Pre-dawn backcountry — dark, cold, high-contrast. The moment before the first run.

**Color palette:**
- Background: `#0A0E1A` (deep navy, night mountain)
- Surface: `#111827` with blue-grey noise grain texture
- Primary accent: `#7DD3FC` (ice blue — fresh snow in sunlight)
- Secondary: `#F0F4FF` (powder white)
- Edge/carving: `#06B6D4` (electric cyan)
- CTA/warm: `#F59E0B` (burnt amber — sunset on mountain, used sparingly)

**Typography:**
- Display: Monument Extended — bold, angular, premium feel
- Body: Geist (Next.js native)
- Spec values: JetBrains Mono — technical, precise

**Texture & atmosphere:**
- CSS noise grain overlay on all surfaces
- Faint topographic contour lines on landing page background
- Frosted glass (`backdrop-filter: blur`) for overlapping panels
- Carving arc SVG lines as section dividers

### Wizard Flow

```
Landing → [Start] → Phase 1 → Phase 2 → Phase 3 (branched)
        → Live Score Panel → Result Page → [Save] → OAuth → Saved Sessions
```

### Key Components

- **Progress indicator:** Serpentine trail animation winding down a mountain path — not a generic bar
- **Question card:** Single question per screen; back button always visible
- **Live profile sidebar** (desktop) / **collapsible drawer** (mobile): accumulating spec scores, updates after each answer
- **Result page:** Two panels — spec sheet (left) + Claude narrative (right). Editing any prior answer prunes stale downstream answers that depended on the changed value before re-scoring — the live sidebar enters a transient "recalculating" state during pruning.
- **Refinement panel:** Accordion of all answered questions; edit any → re-score + re-narrate
- **PDF export:** `GET /api/recommendations/:id/pdf` — Puppeteer renders spec sheet server-side

### Animation System (Framer Motion + GSAP)

*Principle: Every motion has physical weight. Things cut, spray, and land — nothing floats generically.*

| Moment | Animation |
|---|---|
| Question card enter | Slides from right with rotational skew (nose-lift feel), spring physics `stiffness: 300, damping: 25` |
| Question card exit | Cuts left with motion blur trail — sharp, decisive |
| Answer selection | Ice-crack radial ripple from tap point, card locks |
| Phase transition | Full-viewport powder burst (white particles from center, GSAP timeline ~600ms) |
| Live score update | Number scramble effect before values settle |
| Result reveal | Spec items draw themselves left-to-right (carving tracks in snow) |
| Claude narrative | Word-by-word reveal with frost crystallization blur clearing |
| Progress trail | Fluid serpentine fill — mountain path descent |
| Save prompt | Rises from bottom (lift chair arriving), smooth ease-out |

**Ambient particles:** react-three-fiber snow particle scene on landing page and phase transitions only — not on every screen.

**Micro-interactions:**
- Option hover: faint carving arc underline traces beneath text
- Back button: chevron animates as heel-side edge engage
- PDF download: brief crystallization freeze on click

### RWD Breakpoints

- Mobile (< 768px): Single column, live panel as bottom drawer, spec sheet stacks vertically
- Tablet (768–1024px): Sidebar collapsed by default, expandable
- Desktop (> 1024px): Two-column layout throughout

### Frontend Tech

| Tool | Purpose |
|---|---|
| Next.js 14 App Router | SSR, shared `/result/[share_token]` pages |
| Zustand | Wizard state (persisted to `localStorage` with 7-day expiry — survives tab close for guest resume) |
| NextAuth.js | Google OAuth, session management |
| Framer Motion | Card transitions, spring physics, layout animations |
| GSAP | Phase transition timelines (powder burst) |
| react-three-fiber | Ambient snow particle scene |
| Tailwind CSS | Utility styling with custom design tokens |
| shadcn/ui | Component base, fully reskinned to dark palette |

---

## Full Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, SSR) |
| Backend API | NestJS |
| Shared types/schema | Turborepo `packages/` |
| Auth | NextAuth.js + Google OAuth + NestJS JWT |
| Database | PostgreSQL 16 (RDS Multi-AZ) |
| Cache / sessions | Redis 7 (ElastiCache) |
| AI narrative | Claude API (Anthropic) |
| Animations | Framer Motion + GSAP + react-three-fiber |
| UI components | shadcn/ui + Tailwind CSS |
| Container orchestration | Kubernetes (EKS) + Helm |
| Container registry | AWS ECR |
| Observability | CloudWatch + X-Ray |
| DNS / SSL | Route 53 + ACM |
| Secrets | AWS Secrets Manager |
| CI/CD | GitHub Actions |
| Local dev | Docker Compose |

---

## Out of Scope (POC)

- Mobile native app
- Product catalog / affiliate links
- Multi-language support
- Email notifications (AWS SES)
- Admin panel for wizard question management
- Multi-environment (dev/staging) — single prod environment for POC
