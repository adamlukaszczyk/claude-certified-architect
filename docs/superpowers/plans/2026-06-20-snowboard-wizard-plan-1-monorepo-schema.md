# Snowboard Wizard — Plan 1: Monorepo Scaffold + wizard-schema Package

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the Turborepo monorepo under `91_snowboard_wizard/` and build the `wizard-schema` package — the single source of truth for all questions, branching rules, and scoring thresholds that both `apps/web` and `apps/api` will import.

**Architecture:** Turborepo pnpm workspace with three stub app packages (`apps/web`, `apps/api`) and two real packages (`packages/types`, `packages/wizard-schema`). The `wizard-schema` package owns YAML question files, TypeScript branching rules, YAML score-to-spec mapping tables, and a validated loader that throws at import time if any `showIf` key is missing from `rules.ts`. A third package `packages/ui` is scaffolded as a stub only (implemented in Plan 3).

**Tech Stack:** Node 20+, pnpm 9+, TypeScript 5, Turborepo, js-yaml, zod, Jest + ts-jest

## Global Constraints

- All code lives under `91_snowboard_wizard/` in the repo root
- pnpm workspace (not npm/yarn) — `pnpm-workspace.yaml` declares `apps/*` and `packages/*`
- TypeScript strict mode throughout; no `any`
- `packages/wizard-schema` is the *only* place question text, weights, branching logic, and scoring thresholds live — never duplicated in app code
- YAML `showIf` values are strings that must be exact keys of the `rules` export in `rules.ts`; the loader validates this at startup and throws with a descriptive error listing every missing key
- Scoring weights in YAML use `Partial<SpecScores>` — an option only lists the dimensions it affects
- No database, no HTTP, no auth in this plan — pure schema + types + loader
- Jest tests run via `pnpm test` from the workspace root using Turborepo pipeline

---

### Task 1: Monorepo scaffold

**Files:**
- Create: `91_snowboard_wizard/package.json`
- Create: `91_snowboard_wizard/pnpm-workspace.yaml`
- Create: `91_snowboard_wizard/turbo.json`
- Create: `91_snowboard_wizard/tsconfig.base.json`
- Create: `91_snowboard_wizard/.gitignore`
- Create: `91_snowboard_wizard/apps/web/package.json` (stub)
- Create: `91_snowboard_wizard/apps/api/package.json` (stub)
- Create: `91_snowboard_wizard/packages/ui/package.json` (stub)

**Interfaces:**
- Produces: workspace root that `pnpm install` and `turbo build` can run against

- [ ] **Step 1: Create the workspace root**

```bash
mkdir -p 91_snowboard_wizard/{apps/web,apps/api,packages/ui}
```

- [ ] **Step 2: Write root `package.json`**

```json
{
  "name": "snowboard-wizard",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "dev": "turbo dev"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.6.0"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 5: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist"
  }
}
```

- [ ] **Step 6: Write `.gitignore`**

```
node_modules/
dist/
.turbo/
*.env.local
.env
```

- [ ] **Step 7: Write stub `apps/web/package.json`**

```json
{
  "name": "@snowboard/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "echo 'web dev (stub)'",
    "build": "echo 'web build (stub)'",
    "test": "echo 'no tests yet'"
  }
}
```

- [ ] **Step 8: Write stub `apps/api/package.json`**

```json
{
  "name": "@snowboard/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "echo 'api dev (stub)'",
    "build": "echo 'api build (stub)'",
    "test": "echo 'no tests yet'"
  }
}
```

- [ ] **Step 9: Write stub `packages/ui/package.json`**

```json
{
  "name": "@snowboard/ui",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "echo 'ui build (stub)'",
    "test": "echo 'no tests yet'"
  }
}
```

- [ ] **Step 10: Install and verify**

```bash
cd 91_snowboard_wizard
pnpm install
pnpm turbo build
```

Expected: Turbo runs stubs with "0 tasks cached", exits 0.

- [ ] **Step 11: Commit**

```bash
git add 91_snowboard_wizard/
git commit -m "feat: scaffold Turborepo monorepo for snowboard wizard"
```

---

### Task 2: `packages/types` — shared domain interfaces

**Files:**
- Create: `91_snowboard_wizard/packages/types/package.json`
- Create: `91_snowboard_wizard/packages/types/tsconfig.json`
- Create: `91_snowboard_wizard/packages/types/src/index.ts`

**Interfaces:**
- Produces: `@snowboard/types` — `User`, `WizardSession`, `Recommendation`, `SpecScores`, `Answers` types imported by both `apps/web` and `apps/api`

- [ ] **Step 1: Write failing test (create test file first)**

```bash
mkdir -p 91_snowboard_wizard/packages/types/src/__tests__
```

```typescript
// packages/types/src/__tests__/types.test.ts
import type { SpecScores, Answers } from '../index'

describe('SpecScores type', () => {
  it('accepts a complete spec scores object', () => {
    const scores: SpecScores = {
      length: 10,
      width: 2,
      flex: 5,
      shape: 1,
      camber: 0,
      taper: 1,
      sidecut: 0,
      setback: -1,
      base: 0,
      float: 3,
    }
    expect(typeof scores.flex).toBe('number')
  })
})
```

- [ ] **Step 2: Write `packages/types/package.json`**

```json
{
  "name": "@snowboard/types",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: Write `packages/types/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write `packages/types/src/index.ts`**

```typescript
// index.ts - Shared domain interfaces for @snowboard/types

export type SpecScores = {
  length: number    // raw score → board length in cm
  width: number     // raw score → waist width category
  flex: number      // raw score → 1–10 flex rating
  shape: number     // raw score → directional / twin / directional-twin / tapered
  camber: number    // raw score → camber / rocker / hybrid / flat
  taper: number     // raw score → mm taper ratio
  sidecut: number   // raw score → short / medium / long radius
  setback: number   // raw score → centered / slight / aggressive
  base: number      // raw score → sintered / extruded
  float: number     // raw score → powder float priority
}

export type RidingStyle =
  | 'freestyle'
  | 'all-mountain'
  | 'freeride'
  | 'carving'
  | 'powder'
  | 'splitboard'

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export type FootStance = 'regular' | 'goofy'

export type SnowCondition = 'hardpack' | 'powder' | 'mixed' | 'ice'

export type Answers = {
  // Phase 1
  heightCategory?: string
  weightCategory?: string
  bootSize?: string
  experience?: ExperienceLevel
  stance?: FootStance
  ridingDays?: number
  // Phase 2
  style?: RidingStyle
  terrain?: {
    park: number        // percentage 0–100
    groomed: number
    backcountry: number
    trees: number
  }
  snowCondition?: SnowCondition
  // Phase 3 — freestyle
  parkFeatureFocus?: string
  switchFrequency?: string
  preferredTricks?: string
  // Phase 3 — powder/freeride
  backcountryVsResort?: string
  touringNeeds?: string
  taperPreference?: string
  // Phase 3 — carving
  turnRadius?: string
  edgeAggression?: string
  // Phase 3 — all-mountain
  groomedOffPisteSplit?: string
  speedPreference?: string
  // Phase 4
  camberOverride?: string
  flexFeel?: string
  torsionalRigidity?: string
  baseMaintenance?: string
  stanceSetback?: string
  budgetRange?: string
}

export type PartialScores = Partial<SpecScores>

export type User = {
  id: string
  googleId: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: Date
}

export type WizardSession = {
  id: string
  userId: string | null   // null = guest
  name: string | null
  answers: Answers
  scores: PartialScores | null
  schemaVersion: number
  phaseReached: number
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type Recommendation = {
  id: string
  sessionId: string
  specSheet: SpecSheet
  claudeNarrative: string | null
  shareToken: string
  createdAt: Date
}

export type SpecSheet = {
  lengthCm: number
  waistWidthMm: number
  flexRating: number
  flexLabel: string
  shape: string
  camberProfile: string
  taperMm: number
  sidecutRadius: string
  setback: string
  baseType: string
  floatPriority: string
}
```

- [ ] **Step 5: Add jest config to `packages/types/package.json`**

Add `"jest"` key alongside `"scripts"`:

```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 6: Install and run test**

```bash
cd 91_snowboard_wizard
pnpm install
cd packages/types && pnpm test
```

Expected: 1 test passing.

- [ ] **Step 7: Commit**

```bash
cd 91_snowboard_wizard
git add packages/types/
git commit -m "feat: add @snowboard/types shared domain interfaces"
```

---

### Task 3: `packages/wizard-schema` scaffold + `src/types.ts`

**Files:**
- Create: `91_snowboard_wizard/packages/wizard-schema/package.json`
- Create: `91_snowboard_wizard/packages/wizard-schema/tsconfig.json`
- Create: `91_snowboard_wizard/packages/wizard-schema/src/types.ts`
- Create: `91_snowboard_wizard/packages/wizard-schema/questions/` (empty dir placeholder)
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/` (empty dir placeholder)

**Interfaces:**
- Consumes: `@snowboard/types` — `SpecScores`, `Answers`, `PartialScores`
- Produces: `@snowboard/wizard-schema` package scaffold; `Question`, `Option`, `ScoreMapping` types from `src/types.ts`

- [ ] **Step 1: Write the failing type test**

```bash
mkdir -p 91_snowboard_wizard/packages/wizard-schema/src/__tests__
mkdir -p 91_snowboard_wizard/packages/wizard-schema/questions
mkdir -p 91_snowboard_wizard/packages/wizard-schema/scoring
```

```typescript
// packages/wizard-schema/src/__tests__/types.test.ts
import type { Question, Option, ScoreMapping } from '../types'
import type { SpecScores } from '@snowboard/types'

describe('Question type', () => {
  it('accepts a well-formed question', () => {
    const option: Option = {
      id: 'low_taper',
      text: 'Stable and predictable',
      weights: { taper: -1 },
    }
    const q: Question = {
      id: 'taper_preference',
      phase: 3,
      text: 'How surfy do you want your board to feel?',
      showIf: 'isPowderFocused',
      options: [option],
    }
    expect(q.id).toBe('taper_preference')
  })

  it('accepts a numeric range question', () => {
    const q: Question = {
      id: 'riding_days',
      phase: 1,
      text: 'How many days per season do you ride?',
      inputType: 'numeric',
      min: 1,
      max: 200,
      answersKey: 'ridingDays',
    }
    expect(q.inputType).toBe('numeric')
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd 91_snowboard_wizard/packages/wizard-schema && pnpm test
```

Expected: FAIL — `Cannot find module '../types'`

- [ ] **Step 3: Write `packages/wizard-schema/package.json`**

```json
{
  "name": "@snowboard/wizard-schema",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@snowboard/types": "workspace:*",
    "js-yaml": "^4.1.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/js-yaml": "^4.0.9",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.6.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@snowboard/types$": "<rootDir>/../types/src/index.ts"
    }
  }
}
```

- [ ] **Step 4: Write `packages/wizard-schema/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "paths": {
      "@snowboard/types": ["../types/src/index.ts"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Write `packages/wizard-schema/src/types.ts`**

```typescript
// types.ts - Wizard-schema-specific types (question shape, scoring mappings)

import type { SpecScores, Answers } from '@snowboard/types'

export type Option = {
  id: string
  text: string
  weights: Partial<SpecScores>
}

export type QuestionInputType = 'single' | 'multi' | 'numeric'

export type Question = {
  id: string
  phase: 1 | 2 | 3 | 4
  text: string
  showIf?: string           // must be a key in rules.ts at runtime
  inputType?: QuestionInputType  // default: 'single'
  answersKey?: keyof Answers  // for numeric inputs, which Answers field to set
  options?: Option[]
  min?: number              // for numeric inputs
  max?: number
  unit?: string             // e.g. 'days/season'
}

export type ScoreRange = [number, number]  // [min, max] inclusive

export type ScoreMapping = {
  scoreRange: ScoreRange
  value: number | string    // resolved spec value (cm, label, etc.)
  label: string
  description: string
}

export type ScoringTable = {
  dimension: keyof SpecScores
  mappings: ScoreMapping[]
}
```

- [ ] **Step 6: Run test — expect pass**

```bash
cd 91_snowboard_wizard && pnpm install
cd packages/wizard-schema && pnpm test src/__tests__/types.test.ts
```

Expected: 2 tests passing.

- [ ] **Step 7: Commit**

```bash
cd 91_snowboard_wizard
git add packages/wizard-schema/
git commit -m "feat: scaffold wizard-schema package with Question and ScoreMapping types"
```

---

### Task 4: Phase 1 & Phase 2 YAML questions

**Files:**
- Create: `91_snowboard_wizard/packages/wizard-schema/questions/phase-1-rider-profile.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/questions/phase-2-style-terrain.yaml`

**Interfaces:**
- Produces: 9 questions (6 Phase 1, 3 Phase 2) in YAML; consumed by the loader in Task 8

- [ ] **Step 1: Write `questions/phase-1-rider-profile.yaml`**

```yaml
# phase-1-rider-profile.yaml — Rider Profile questions (shown to all users)

- id: height_category
  phase: 1
  text: "What is your height?"
  options:
    - id: under_160
      text: "Under 160 cm (5'3\")"
      weights: { length: -2, width: -1 }
    - id: h_160_170
      text: "160–170 cm (5'3\"–5'7\")"
      weights: { length: -1, width: 0 }
    - id: h_171_180
      text: "171–180 cm (5'7\"–5'11\")"
      weights: { length: 0, width: 0 }
    - id: h_181_190
      text: "181–190 cm (5'11\"–6'3\")"
      weights: { length: 1, width: 1 }
    - id: over_190
      text: "Over 190 cm (6'3\"+)"
      weights: { length: 2, width: 2 }

- id: weight_category
  phase: 1
  text: "What is your weight?"
  options:
    - id: under_55
      text: "Under 55 kg (120 lb)"
      weights: { length: -3, width: -2, flex: -1 }
    - id: w_55_70
      text: "55–70 kg (120–155 lb)"
      weights: { length: -1, width: -1, flex: 0 }
    - id: w_71_85
      text: "71–85 kg (155–185 lb)"
      weights: { length: 1, width: 1, flex: 1 }
    - id: w_86_100
      text: "86–100 kg (185–220 lb)"
      weights: { length: 2, width: 2, flex: 2 }
    - id: over_100
      text: "Over 100 kg (220 lb+)"
      weights: { length: 3, width: 3, flex: 3 }

- id: boot_size
  phase: 1
  text: "What is your boot size (US men's)?"
  options:
    - id: bs_7_8
      text: "7–8"
      weights: { width: -2 }
    - id: bs_8_5_9_5
      text: "8.5–9.5"
      weights: { width: -1 }
    - id: bs_10_11
      text: "10–11"
      weights: { width: 0 }
    - id: bs_11_5_12_5
      text: "11.5–12.5"
      weights: { width: 1 }
    - id: bs_13_plus
      text: "13+"
      weights: { width: 2 }

- id: experience
  phase: 1
  text: "What is your riding experience level?"
  options:
    - id: beginner
      text: "Beginner — first few seasons, still learning turns"
      weights: { flex: -3, camber: -2, taper: 0 }
    - id: intermediate
      text: "Intermediate — comfortable on most groomed runs"
      weights: { flex: -1, camber: -1, taper: 0 }
    - id: advanced
      text: "Advanced — confident in varied conditions"
      weights: { flex: 1, camber: 1, taper: 1 }
    - id: expert
      text: "Expert — charge anything, any condition"
      weights: { flex: 3, camber: 2, taper: 2 }

- id: stance
  phase: 1
  text: "What is your foot stance?"
  options:
    - id: regular
      text: "Regular (left foot forward)"
      weights: {}
    - id: goofy
      text: "Goofy (right foot forward)"
      weights: {}

- id: riding_days
  phase: 1
  text: "How many days per season do you ride?"
  inputType: numeric
  answersKey: ridingDays
  min: 1
  max: 200
  unit: "days/season"
```

- [ ] **Step 2: Write `questions/phase-2-style-terrain.yaml`**

```yaml
# phase-2-style-terrain.yaml — Style & Terrain questions (shown to all users)

- id: style
  phase: 2
  text: "What is your primary riding style?"
  options:
    - id: freestyle
      text: "Freestyle — park, rails, jumps, urban"
      weights: { flex: -2, shape: -2, camber: -1, setback: -2 }
    - id: all_mountain
      text: "All-Mountain — a bit of everything"
      weights: { flex: 0, shape: 0, camber: 0, setback: 0 }
    - id: freeride
      text: "Freeride — off-piste, big mountain"
      weights: { flex: 2, shape: 2, camber: 1, setback: 2, float: 2 }
    - id: carving
      text: "Carving — groomed arcs, edge-to-edge"
      weights: { flex: 2, shape: 1, camber: 3, sidecut: 2 }
    - id: powder
      text: "Powder — deep snow, float and surf"
      weights: { flex: 1, shape: 3, taper: 3, float: 4, setback: 3, camber: -1 }
    - id: splitboard
      text: "Splitboard — backcountry touring"
      weights: { flex: 2, shape: 2, taper: 2, float: 2, setback: 2 }

- id: terrain_mix
  phase: 2
  text: "Which terrain best describes your typical day? (choose the closest)"
  options:
    - id: mostly_park
      text: "Mostly park / groomed (80%+ park)"
      weights: { flex: -2, shape: -2, setback: -2 }
    - id: groomed_dominant
      text: "Groomed dominant with some off-piste (60% groomed)"
      weights: { flex: -1, shape: -1, setback: -1 }
    - id: mixed_even
      text: "Even mix of groomed and off-piste"
      weights: { flex: 0, shape: 0, setback: 0 }
    - id: offpiste_dominant
      text: "Off-piste dominant with some groomed (60% off-piste)"
      weights: { flex: 1, float: 1, taper: 1, setback: 1 }
    - id: mostly_backcountry
      text: "Mostly backcountry / untracked (80%+)"
      weights: { flex: 2, float: 2, taper: 2, setback: 2 }

- id: snow_condition
  phase: 2
  text: "What snow conditions do you ride most often?"
  options:
    - id: hardpack
      text: "Hardpack and groomed — firm, predictable"
      weights: { camber: 2, sidecut: 2, base: 1, taper: -1 }
    - id: powder
      text: "Powder — deep and soft"
      weights: { camber: -2, taper: 3, float: 3, base: -1 }
    - id: mixed
      text: "Mixed — whatever the mountain throws at me"
      weights: { camber: 0, taper: 0, base: 0 }
    - id: ice
      text: "Ice and variable — bulletproof and aggressive"
      weights: { camber: 3, sidecut: 3, flex: 2, base: 2 }
```

- [ ] **Step 3: Commit**

```bash
cd 91_snowboard_wizard
git add packages/wizard-schema/questions/
git commit -m "feat: add Phase 1 and Phase 2 wizard question YAML files"
```

---

### Task 5: Phase 3 YAML questions (branched per style)

**Files:**
- Create: `91_snowboard_wizard/packages/wizard-schema/questions/phase-3-freestyle.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/questions/phase-3-powder.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/questions/phase-3-carving.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/questions/phase-3-allmountain.yaml`

**Interfaces:**
- Produces: 11 Phase 3 questions across 4 style branches; all use `showIf` keys that must exist in `rules.ts`

- [ ] **Step 1: Write `questions/phase-3-freestyle.yaml`**

```yaml
# phase-3-freestyle.yaml — Freestyle deep dive (showIf: isFreestyle)

- id: park_feature_focus
  phase: 3
  text: "What park features do you spend most time on?"
  showIf: isFreestyle
  options:
    - id: rails_boxes
      text: "Rails and boxes"
      weights: { flex: -2, shape: -3 }
    - id: jumps_kickers
      text: "Jumps and kickers"
      weights: { flex: -1, shape: -1, camber: 1 }
    - id: halfpipe
      text: "Halfpipe"
      weights: { flex: 1, shape: -2, camber: 2, sidecut: 1 }
    - id: urban_street
      text: "Urban / street spots"
      weights: { flex: -3, shape: -3, setback: -3 }

- id: switch_frequency
  phase: 3
  text: "How often do you ride switch (backwards)?"
  showIf: isFreestyle
  options:
    - id: rarely
      text: "Rarely — I'm solidly regular/goofy"
      weights: { shape: -1 }
    - id: sometimes
      text: "Sometimes — I can, but it's not my focus"
      weights: { shape: 0 }
    - id: half_half
      text: "Half and half — equally comfortable both ways"
      weights: { shape: -2 }
    - id: always
      text: "Always — switch is just as strong as regular"
      weights: { shape: -3 }

- id: preferred_tricks
  phase: 3
  text: "What tricks are you working toward?"
  showIf: isFreestyle
  options:
    - id: butters_presses
      text: "Butters and ground presses"
      weights: { flex: -3, camber: -2 }
    - id: spins_270_540
      text: "Spins 270–540"
      weights: { flex: -1, shape: -1 }
    - id: spins_720_plus
      text: "Big spins 720+"
      weights: { flex: 0, camber: 1 }
    - id: tech_rails
      text: "Technical rail combos"
      weights: { flex: -2, shape: -2, camber: -1 }
```

- [ ] **Step 2: Write `questions/phase-3-powder.yaml`**

```yaml
# phase-3-powder.yaml — Powder/Freeride deep dive (showIf: isPowderFocused)

- id: backcountry_vs_resort
  phase: 3
  text: "Where do you ride powder?"
  showIf: isPowderFocused
  options:
    - id: resort_only
      text: "Resort only — lift-accessed powder days"
      weights: { taper: 1, float: 1, setback: 1 }
    - id: resort_some_bc
      text: "Mostly resort, some backcountry"
      weights: { taper: 2, float: 2, setback: 2 }
    - id: equal_split
      text: "Equal split between resort and backcountry"
      weights: { taper: 2, float: 2, setback: 3 }
    - id: mostly_bc
      text: "Mostly backcountry, inbounds when necessary"
      weights: { taper: 3, float: 3, setback: 3 }

- id: touring_needs
  phase: 3
  text: "Do you need splitboard / touring capability?"
  showIf: splitboardCandidate
  options:
    - id: no_touring
      text: "No — I hike in or lift access only"
      weights: {}
    - id: light_touring
      text: "Light touring — occasional skin tracks"
      weights: { flex: 1 }
    - id: full_touring
      text: "Full touring setup — multi-day missions"
      weights: { flex: 2, base: 1 }

- id: taper_preference
  phase: 3
  text: "How surfy do you want your board to feel in powder?"
  showIf: needsTaperQuestion
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

- [ ] **Step 3: Write `questions/phase-3-carving.yaml`**

```yaml
# phase-3-carving.yaml — Carving deep dive (showIf: isCarving)

- id: turn_radius
  phase: 3
  text: "What turn radius feels best for you?"
  showIf: isCarving
  options:
    - id: short_tight
      text: "Short, tight arcs — quick pivoting, slalom-style"
      weights: { sidecut: -2, camber: 2 }
    - id: medium_arcs
      text: "Medium arcs — versatile, all-mountain carving"
      weights: { sidecut: 0, camber: 1 }
    - id: long_arcs
      text: "Long, drawn-out GS arcs — speed and drive"
      weights: { sidecut: 2, camber: 3, flex: 2 }

- id: edge_aggression
  phase: 3
  text: "How aggressive are you on edge?"
  showIf: isCarving
  options:
    - id: relaxed
      text: "Relaxed — I enjoy carving but don't chase speed"
      weights: { flex: -1, camber: 1 }
    - id: moderate
      text: "Moderate — committed arcs, controlled aggression"
      weights: { flex: 1, camber: 2 }
    - id: full_send
      text: "Full send — knees in the snow, maximum angle"
      weights: { flex: 3, camber: 3, sidecut: 2 }
```

- [ ] **Step 4: Write `questions/phase-3-allmountain.yaml`**

```yaml
# phase-3-allmountain.yaml — All-mountain deep dive (showIf: isAllMountain)

- id: groomed_offpiste_split
  phase: 3
  text: "On a typical resort day, how do you split your time?"
  showIf: isAllMountain
  options:
    - id: mostly_groomed
      text: "Mostly groomed (70%+ on-piste)"
      weights: { camber: 1, sidecut: 1, flex: 1, setback: -1 }
    - id: even_split
      text: "Even split — groomed morning, off-piste afternoon"
      weights: { camber: 0, flex: 0, setback: 0 }
    - id: mostly_offpiste
      text: "Mostly off-piste (70%+ off-piste, trees, bumps)"
      weights: { camber: -1, float: 1, taper: 1, setback: 1 }

- id: speed_preference
  phase: 3
  text: "What is your preferred pace on the mountain?"
  showIf: isAllMountain
  options:
    - id: mellow
      text: "Mellow — I enjoy the ride, not the speed"
      weights: { flex: -1, camber: -1 }
    - id: moderate
      text: "Moderate — I push it but ride in control"
      weights: { flex: 0, camber: 0 }
    - id: fast
      text: "Fast — I chase speed and thrive at high velocity"
      weights: { flex: 2, camber: 2, sidecut: 1 }
```

- [ ] **Step 5: Commit**

```bash
cd 91_snowboard_wizard
git add packages/wizard-schema/questions/
git commit -m "feat: add Phase 3 branched wizard question YAML files"
```

---

### Task 6: Phase 4 YAML + scoring mapping YAMLs

**Files:**
- Create: `91_snowboard_wizard/packages/wizard-schema/questions/phase-4-refinement.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/flex-mapping.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/length-mapping.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/width-mapping.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/shape-mapping.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/camber-mapping.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/taper-mapping.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/sidecut-mapping.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/setback-mapping.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/base-mapping.yaml`
- Create: `91_snowboard_wizard/packages/wizard-schema/scoring/float-mapping.yaml`

**Interfaces:**
- Produces: Phase 4 opt-in questions + all 10 score-to-spec threshold tables; consumed by the scoring engine in Plan 2

- [ ] **Step 1: Write `questions/phase-4-refinement.yaml`**

```yaml
# phase-4-refinement.yaml — Advanced refinement (opt-in, shown after initial recommendation)

- id: camber_override
  phase: 4
  text: "Do you have a strong camber preference?"
  options:
    - id: traditional_camber
      text: "Traditional camber — maximum pop and edge hold"
      weights: { camber: 4 }
    - id: rocker
      text: "Rocker (reverse camber) — catch-free and floaty"
      weights: { camber: -4 }
    - id: flat
      text: "Flat — stable and forgiving"
      weights: { camber: -2 }
    - id: hybrid
      text: "Hybrid — I like whatever the board recommends"
      weights: {}

- id: flex_feel
  phase: 4
  text: "How do you want the board to feel underfoot?"
  options:
    - id: buttery_soft
      text: "Buttery soft — maximum playfulness, easy pressing"
      weights: { flex: -3 }
    - id: medium_forgiving
      text: "Medium — forgiving but with some snap"
      weights: { flex: -1 }
    - id: responsive_stiff
      text: "Responsive stiff — surfy poppy feel when loaded"
      weights: { flex: 2 }
    - id: board_decides
      text: "Let the board recommend based on my style"
      weights: {}

- id: torsional_rigidity
  phase: 4
  text: "Torsional rigidity preference (how much the board twists tip-to-tail)"
  options:
    - id: torsionally_soft
      text: "Torsionally soft — more forgiving, easier butters"
      weights: { flex: -1 }
    - id: torsionally_stiff
      text: "Torsionally stiff — precise edge-to-edge, carvey"
      weights: { camber: 1, sidecut: 1 }
    - id: no_preference
      text: "No preference — let the style drive it"
      weights: {}

- id: base_maintenance
  phase: 4
  text: "How often do you wax and tune your board?"
  options:
    - id: rarely
      text: "Rarely — I want low-maintenance"
      weights: { base: -1 }
    - id: occasionally
      text: "Occasionally — a few times a season"
      weights: { base: 0 }
    - id: regularly
      text: "Regularly — I tune before most trips"
      weights: { base: 1 }

- id: stance_setback
  phase: 4
  text: "Stance setback preference"
  options:
    - id: centered
      text: "Centered — equal float front and back"
      weights: { setback: -2 }
    - id: slight_setback
      text: "Slight setback — a little float in pow"
      weights: { setback: 0 }
    - id: aggressive_setback
      text: "Aggressive setback — deep pow bias"
      weights: { setback: 2 }

- id: budget_range
  phase: 4
  text: "What is your budget range for a new board?"
  options:
    - id: under_400
      text: "Under $400 — value-focused"
      weights: { base: -1, flex: -1 }
    - id: between_400_600
      text: "$400–$600 — mid-range"
      weights: {}
    - id: between_600_900
      text: "$600–$900 — performance-focused"
      weights: { base: 1, flex: 1 }
    - id: over_900
      text: "Over $900 — top of line"
      weights: { base: 2, flex: 2 }
```

- [ ] **Step 2: Write all 10 scoring YAML files**

`scoring/flex-mapping.yaml`:
```yaml
# flex-mapping.yaml — raw flex score → flex rating (1–10) and label
dimension: flex
mappings:
  - scoreRange: [-999, -4]
    value: 2
    label: "Very Soft"
    description: "Maximum forgiveness, ideal for beginners and butter-focused freestyle"
  - scoreRange: [-3, 0]
    value: 3
    label: "Soft"
    description: "Forgiving and playful, ideal for park and beginner/intermediate"
  - scoreRange: [1, 4]
    value: 5
    label: "Medium"
    description: "Versatile for all-mountain riding in varied conditions"
  - scoreRange: [5, 8]
    value: 7
    label: "Medium-Stiff"
    description: "Responsive and precise, good for advanced all-mountain and carving"
  - scoreRange: [9, 999]
    value: 9
    label: "Stiff"
    description: "Maximum response and stability at speed, for expert riders"
```

`scoring/length-mapping.yaml`:
```yaml
# length-mapping.yaml — raw length score → board length in cm
dimension: length
mappings:
  - scoreRange: [-999, -4]
    value: 145
    label: "145 cm"
    description: "Short board for lightweight or youth riders, easy to maneuver"
  - scoreRange: [-3, -1]
    value: 150
    label: "150 cm"
    description: "Short, nimble — park-focused and lighter riders"
  - scoreRange: [0, 2]
    value: 155
    label: "155 cm"
    description: "Mid-length, versatile for average-build all-mountain riders"
  - scoreRange: [3, 5]
    value: 158
    label: "158 cm"
    description: "Mid-length for taller or heavier all-mountain riders"
  - scoreRange: [6, 8]
    value: 162
    label: "162 cm"
    description: "Longer board for freeride and heavier/taller riders"
  - scoreRange: [9, 999]
    value: 166
    label: "166 cm"
    description: "Full-length freeride — maximum float and high-speed stability"
```

`scoring/width-mapping.yaml`:
```yaml
# width-mapping.yaml — raw width score → waist width in mm
dimension: width
mappings:
  - scoreRange: [-999, -3]
    value: 238
    label: "Narrow (238 mm)"
    description: "For small boots — reduces toe/heel drag on hardpack"
  - scoreRange: [-2, 0]
    value: 248
    label: "Regular (248 mm)"
    description: "Standard width, fits most boot sizes 8–10"
  - scoreRange: [1, 3]
    value: 255
    label: "Mid-wide (255 mm)"
    description: "For larger boots or wider stances"
  - scoreRange: [4, 999]
    value: 263
    label: "Wide (263 mm)"
    description: "For boots 12+ — prevents toe/heel drag"
```

`scoring/shape-mapping.yaml`:
```yaml
# shape-mapping.yaml — raw shape score → board shape
dimension: shape
mappings:
  - scoreRange: [-999, -2]
    value: "twin"
    label: "True Twin"
    description: "Identical nose and tail — perfect for switch riding and freestyle"
  - scoreRange: [-1, 1]
    value: "directional-twin"
    label: "Directional Twin"
    description: "Slightly directional twin — versatile all-mountain with slight powder bias"
  - scoreRange: [2, 4]
    value: "directional"
    label: "Directional"
    description: "Distinct nose and tail — optimized for one direction, freeride and carving"
  - scoreRange: [5, 999]
    value: "tapered-directional"
    label: "Tapered Directional"
    description: "Wider nose, narrower tail — maximum powder float and surf feel"
```

`scoring/camber-mapping.yaml`:
```yaml
# camber-mapping.yaml — raw camber score → camber profile
dimension: camber
mappings:
  - scoreRange: [-999, -3]
    value: "rocker"
    label: "Full Rocker"
    description: "Catch-free, floaty in powder — ideal for beginners and powder hounds"
  - scoreRange: [-2, -1]
    value: "flat-to-rocker"
    label: "Flat-to-Rocker"
    description: "Flat underfoot with rocker in tip and tail — playful with some stability"
  - scoreRange: [0, 1]
    value: "hybrid"
    label: "Hybrid (CamRock)"
    description: "Camber underfoot, rocker in tip/tail — versatile all-mountain"
  - scoreRange: [2, 3]
    value: "camber"
    label: "Traditional Camber"
    description: "Full camber — maximum pop, edge hold, and energy return"
  - scoreRange: [4, 999]
    value: "camber"
    label: "Aggressive Camber"
    description: "Full camber for aggressive carving and high-speed performance"
```

`scoring/taper-mapping.yaml`:
```yaml
# taper-mapping.yaml — raw taper score → taper in mm
dimension: taper
mappings:
  - scoreRange: [-999, 0]
    value: 0
    label: "No Taper (0 mm)"
    description: "Twin tip geometry — equal width nose and tail"
  - scoreRange: [1, 2]
    value: 5
    label: "Low Taper (5 mm)"
    description: "Slight directional bias — all-mountain with a hint of float"
  - scoreRange: [3, 4]
    value: 15
    label: "Medium Taper (15 mm)"
    description: "Noticeable float improvement in powder, still versatile"
  - scoreRange: [5, 999]
    value: 25
    label: "High Taper (25 mm)"
    description: "Maximum surf feel — wide nose, narrow tail, aggressive powder bias"
```

`scoring/sidecut-mapping.yaml`:
```yaml
# sidecut-mapping.yaml — raw sidecut score → sidecut radius description
dimension: sidecut
mappings:
  - scoreRange: [-999, -1]
    value: "short"
    label: "Short Radius (< 7m)"
    description: "Quick, tight turns — agile park and mogul riding"
  - scoreRange: [0, 2]
    value: "medium"
    label: "Medium Radius (7–9m)"
    description: "Versatile — comfortable at varied speeds and terrain"
  - scoreRange: [3, 999]
    value: "long"
    label: "Long Radius (> 9m)"
    description: "Drawn-out GS arcs — high-speed carving and freeride"
```

`scoring/setback-mapping.yaml`:
```yaml
# setback-mapping.yaml — raw setback score → stance setback
dimension: setback
mappings:
  - scoreRange: [-999, -1]
    value: "centered"
    label: "Centered"
    description: "Equal weight distribution — freestyle and switch riding"
  - scoreRange: [0, 2]
    value: "slight"
    label: "Slight Setback (10–15 mm)"
    description: "Minor powder bias while maintaining versatility"
  - scoreRange: [3, 999]
    value: "aggressive"
    label: "Aggressive Setback (20+ mm)"
    description: "Heavy pow bias — tail-heavy for deep snow float"
```

`scoring/base-mapping.yaml`:
```yaml
# base-mapping.yaml — raw base score → base type
dimension: base
mappings:
  - scoreRange: [-999, 0]
    value: "extruded"
    label: "Extruded Base"
    description: "Low maintenance, holds wax less — good for casual riders"
  - scoreRange: [1, 999]
    value: "sintered"
    label: "Sintered Base"
    description: "Absorbs wax, faster on snow — requires regular waxing"
```

`scoring/float-mapping.yaml`:
```yaml
# float-mapping.yaml — raw float score → powder float priority label
dimension: float
mappings:
  - scoreRange: [-999, 1]
    value: "low"
    label: "Low Float Priority"
    description: "Hardpack and groomed performance prioritized over powder float"
  - scoreRange: [2, 4]
    value: "medium"
    label: "Moderate Float"
    description: "Balanced powder capability alongside groomed performance"
  - scoreRange: [5, 8]
    value: "high"
    label: "High Float"
    description: "Powder performance is the primary consideration"
  - scoreRange: [9, 999]
    value: "maximum"
    label: "Maximum Float"
    description: "Every spec optimized for deep snow — dedicated powder quiver"
```

- [ ] **Step 3: Commit**

```bash
cd 91_snowboard_wizard
git add packages/wizard-schema/questions/phase-4-refinement.yaml
git add packages/wizard-schema/scoring/
git commit -m "feat: add Phase 4 questions and all 10 scoring threshold YAML files"
```

---

### Task 7: Branching rules (`src/rules.ts`)

**Files:**
- Create: `91_snowboard_wizard/packages/wizard-schema/src/rules.ts`

**Interfaces:**
- Consumes: `Answers`, `PartialScores` from `@snowboard/types`
- Produces: `rules` — `Record<string, (a: Answers, s?: PartialScores) => boolean>`; every string used as `showIf` in YAML must be a key here

- [ ] **Step 1: Write failing test**

```typescript
// packages/wizard-schema/src/__tests__/rules.test.ts
import { rules } from '../rules'

const base = (): import('@snowboard/types').Answers => ({
  experience: 'intermediate',
  style: 'all-mountain',
  ridingDays: 20,
  terrain: { park: 20, groomed: 40, backcountry: 30, trees: 10 },
})

describe('isFreestyle', () => {
  it('returns true when style is freestyle', () => {
    expect(rules.isFreestyle({ ...base(), style: 'freestyle' })).toBe(true)
  })
  it('returns false for other styles', () => {
    expect(rules.isFreestyle(base())).toBe(false)
  })
})

describe('isPowderFocused', () => {
  it('returns true for powder style', () => {
    expect(rules.isPowderFocused({ ...base(), style: 'powder' })).toBe(true)
  })
  it('returns true for freeride style', () => {
    expect(rules.isPowderFocused({ ...base(), style: 'freeride' })).toBe(true)
  })
  it('returns false for all-mountain', () => {
    expect(rules.isPowderFocused(base())).toBe(false)
  })
})

describe('isCarving', () => {
  it('returns true for carving style', () => {
    expect(rules.isCarving({ ...base(), style: 'carving' })).toBe(true)
  })
})

describe('isAllMountain', () => {
  it('returns true for all-mountain style', () => {
    expect(rules.isAllMountain(base())).toBe(true)
  })
})

describe('splitboardCandidate', () => {
  it('returns true for freeride with heavy backcountry and many riding days', () => {
    expect(rules.splitboardCandidate({
      ...base(),
      style: 'freeride',
      terrain: { park: 0, groomed: 10, backcountry: 80, trees: 10 },
      ridingDays: 20,
    })).toBe(true)
  })
  it('returns false when backcountry is under 60%', () => {
    expect(rules.splitboardCandidate({
      ...base(),
      style: 'freeride',
      terrain: { park: 10, groomed: 40, backcountry: 40, trees: 10 },
      ridingDays: 20,
    })).toBe(false)
  })
  it('returns false when riding days is under 15', () => {
    expect(rules.splitboardCandidate({
      ...base(),
      style: 'freeride',
      terrain: { park: 0, groomed: 10, backcountry: 80, trees: 10 },
      ridingDays: 10,
    })).toBe(false)
  })
})

describe('needsTaperQuestion', () => {
  it('returns true for advanced powder rider with high flex score', () => {
    expect(rules.needsTaperQuestion(
      { ...base(), style: 'powder', experience: 'advanced' },
      { flex: 6 }
    )).toBe(true)
  })
  it('returns false for beginner powder rider', () => {
    expect(rules.needsTaperQuestion(
      { ...base(), style: 'powder', experience: 'beginner' },
      { flex: 6 }
    )).toBe(false)
  })
  it('returns false when flex score is below 5', () => {
    expect(rules.needsTaperQuestion(
      { ...base(), style: 'powder', experience: 'advanced' },
      { flex: 4 }
    )).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd 91_snowboard_wizard/packages/wizard-schema && pnpm test src/__tests__/rules.test.ts
```

Expected: FAIL — `Cannot find module '../rules'`

- [ ] **Step 3: Write `src/rules.ts`**

```typescript
// rules.ts - Branching condition functions for the wizard
// Every showIf value in YAML must be a key exported from this object.

import type { Answers, PartialScores } from '@snowboard/types'

export const rules: Record<string, (a: Answers, s?: PartialScores) => boolean> = {
  isFreestyle: (a) =>
    a.style === 'freestyle',

  isPowderFocused: (a) =>
    a.style === 'powder' || a.style === 'freeride',

  isCarving: (a) =>
    a.style === 'carving',

  isAllMountain: (a) =>
    a.style === 'all-mountain',

  splitboardCandidate: (a) =>
    a.style === 'freeride' &&
    (a.terrain?.backcountry ?? 0) > 60 &&
    (a.ridingDays ?? 0) > 15,

  needsTaperQuestion: (a, s) =>
    (a.style === 'powder' || a.style === 'freeride') &&
    a.experience !== 'beginner' &&
    (s?.flex ?? 0) >= 5,
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd 91_snowboard_wizard/packages/wizard-schema && pnpm test src/__tests__/rules.test.ts
```

Expected: 10 tests passing.

- [ ] **Step 5: Commit**

```bash
cd 91_snowboard_wizard
git add packages/wizard-schema/src/rules.ts packages/wizard-schema/src/__tests__/rules.test.ts
git commit -m "feat: add wizard branching rules with full test coverage"
```

---

### Task 8: YAML loader + Zod validation (`src/loader.ts`)

**Files:**
- Create: `91_snowboard_wizard/packages/wizard-schema/src/loader.ts`

**Interfaces:**
- Consumes: `Question`, `ScoreMapping`, `ScoringTable` from `src/types.ts`; `rules` from `src/rules.ts`; all YAML files in `questions/` and `scoring/`
- Produces: `loadQuestions(): Question[]`, `loadScoringTables(): ScoringTable[]` — both throw with descriptive errors on invalid schema

- [ ] **Step 1: Write failing tests**

```typescript
// packages/wizard-schema/src/__tests__/loader.test.ts
import path from 'path'
import { loadQuestions, loadScoringTables } from '../loader'

const SCHEMA_ROOT = path.resolve(__dirname, '../../')

describe('loadQuestions', () => {
  it('loads all questions without throwing', () => {
    const questions = loadQuestions(SCHEMA_ROOT)
    expect(questions.length).toBeGreaterThan(20)
  })

  it('all questions have required fields', () => {
    const questions = loadQuestions(SCHEMA_ROOT)
    for (const q of questions) {
      expect(typeof q.id).toBe('string')
      expect([1, 2, 3, 4]).toContain(q.phase)
      expect(typeof q.text).toBe('string')
    }
  })

  it('rejects a question with an unknown showIf rule', () => {
    expect(() =>
      loadQuestions(SCHEMA_ROOT, [
        {
          id: 'bad_question',
          phase: 3,
          text: 'Test?',
          showIf: 'nonExistentRule',
          options: [],
        },
      ])
    ).toThrow(/nonExistentRule/)
  })

  it('all showIf values in real YAML exist in rules.ts', () => {
    expect(() => loadQuestions(SCHEMA_ROOT)).not.toThrow()
  })
})

describe('loadScoringTables', () => {
  it('loads all 10 scoring dimension tables', () => {
    const tables = loadScoringTables(SCHEMA_ROOT)
    expect(tables.length).toBe(10)
  })

  it('every table has a valid dimension name', () => {
    const tables = loadScoringTables(SCHEMA_ROOT)
    const validDimensions = ['length', 'width', 'flex', 'shape', 'camber', 'taper', 'sidecut', 'setback', 'base', 'float']
    for (const table of tables) {
      expect(validDimensions).toContain(table.dimension)
    }
  })

  it('score ranges are non-overlapping and sorted within each table', () => {
    const tables = loadScoringTables(SCHEMA_ROOT)
    for (const table of tables) {
      for (let i = 1; i < table.mappings.length; i++) {
        const prev = table.mappings[i - 1]
        const curr = table.mappings[i]
        expect(curr.scoreRange[0]).toBeGreaterThan(prev.scoreRange[1])
      }
    }
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd 91_snowboard_wizard/packages/wizard-schema && pnpm test src/__tests__/loader.test.ts
```

Expected: FAIL — `Cannot find module '../loader'`

- [ ] **Step 3: Write `src/loader.ts`**

```typescript
// loader.ts - YAML loader with Zod validation for wizard questions and scoring tables

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { z } from 'zod'
import { rules } from './rules'
import type { Question, ScoringTable } from './types'

const OptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  weights: z.record(z.number()).default({}),
})

const QuestionSchema = z.object({
  id: z.string(),
  phase: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string(),
  showIf: z.string().optional(),
  inputType: z.enum(['single', 'multi', 'numeric']).optional(),
  answersKey: z.string().optional(),
  options: z.array(OptionSchema).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().optional(),
})

const ScoreMappingSchema = z.object({
  scoreRange: z.tuple([z.number(), z.number()]),
  value: z.union([z.number(), z.string()]),
  label: z.string(),
  description: z.string(),
})

const ScoringTableSchema = z.object({
  dimension: z.string(),
  mappings: z.array(ScoreMappingSchema),
})

function loadYamlFile<T>(filePath: string, schema: z.ZodType<T>): T {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed = yaml.load(raw)
  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Invalid YAML schema in ${filePath}:\n${result.error.toString()}`
    )
  }
  return result.data
}

function validateShowIfKeys(questions: Question[]): void {
  const ruleKeys = new Set(Object.keys(rules))
  const missing: string[] = []
  for (const q of questions) {
    if (q.showIf && !ruleKeys.has(q.showIf)) {
      missing.push(`Question "${q.id}" references unknown rule "${q.showIf}"`)
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `wizard-schema validation failed — missing rule functions in rules.ts:\n${missing.join('\n')}`
    )
  }
}

export function loadQuestions(
  schemaRoot: string,
  extraQuestions: unknown[] = []
): Question[] {
  const questionsDir = path.join(schemaRoot, 'questions')
  const files = fs
    .readdirSync(questionsDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()

  const allRaw: unknown[] = []
  for (const file of files) {
    const parsed = yaml.load(
      fs.readFileSync(path.join(questionsDir, file), 'utf-8')
    )
    if (Array.isArray(parsed)) allRaw.push(...parsed)
  }
  allRaw.push(...extraQuestions)

  const questions: Question[] = allRaw.map((raw, i) => {
    const result = QuestionSchema.safeParse(raw)
    if (!result.success) {
      throw new Error(`Question at index ${i} is invalid:\n${result.error.toString()}`)
    }
    return result.data as Question
  })

  validateShowIfKeys(questions)
  return questions
}

export function loadScoringTables(schemaRoot: string): ScoringTable[] {
  const scoringDir = path.join(schemaRoot, 'scoring')
  const files = fs
    .readdirSync(scoringDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()

  return files.map((file) => {
    const filePath = path.join(scoringDir, file)
    return loadYamlFile(filePath, ScoringTableSchema) as ScoringTable
  })
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd 91_snowboard_wizard/packages/wizard-schema && pnpm test src/__tests__/loader.test.ts
```

Expected: All loader tests passing.

- [ ] **Step 5: Run full test suite**

```bash
cd 91_snowboard_wizard/packages/wizard-schema && pnpm test
```

Expected: All tests passing (rules + types + loader).

- [ ] **Step 6: Commit**

```bash
cd 91_snowboard_wizard
git add packages/wizard-schema/src/loader.ts packages/wizard-schema/src/__tests__/loader.test.ts
git commit -m "feat: add YAML loader with Zod validation and showIf rule enforcement"
```

---

### Task 9: Package public index (`src/index.ts`)

**Files:**
- Create: `91_snowboard_wizard/packages/wizard-schema/src/index.ts`

**Interfaces:**
- Produces: single public entry point for `@snowboard/wizard-schema`; both `apps/web` and `apps/api` import from here

- [ ] **Step 1: Write `src/index.ts`**

```typescript
// index.ts - Public API for @snowboard/wizard-schema

export { rules } from './rules'
export { loadQuestions, loadScoringTables } from './loader'
export type { Question, Option, ScoreMapping, ScoringTable, QuestionInputType } from './types'
```

- [ ] **Step 2: Build the package**

```bash
cd 91_snowboard_wizard/packages/wizard-schema && pnpm build
```

Expected: `dist/` directory created with `index.js`, `index.d.ts`.

- [ ] **Step 3: Run Turborepo build from root**

```bash
cd 91_snowboard_wizard && pnpm turbo build
```

Expected: All packages build; `@snowboard/wizard-schema` after `@snowboard/types`.

- [ ] **Step 4: Commit**

```bash
cd 91_snowboard_wizard
git add packages/wizard-schema/src/index.ts
git commit -m "feat: export public API from wizard-schema package"
```

---

### Task 10: Integration smoke test

**Files:**
- Create: `91_snowboard_wizard/packages/wizard-schema/src/__tests__/integration.test.ts`

**Interfaces:**
- Consumes: complete `@snowboard/wizard-schema` public API
- Produces: end-to-end confidence that questions load, rules evaluate, and scores map correctly

- [ ] **Step 1: Write integration test**

```typescript
// packages/wizard-schema/src/__tests__/integration.test.ts
import path from 'path'
import { loadQuestions, loadScoringTables, rules } from '../index'
import type { Answers, PartialScores } from '@snowboard/types'

const SCHEMA_ROOT = path.resolve(__dirname, '../../')

describe('full schema integration', () => {
  let allQuestions: ReturnType<typeof loadQuestions>
  let scoringTables: ReturnType<typeof loadScoringTables>

  beforeAll(() => {
    allQuestions = loadQuestions(SCHEMA_ROOT)
    scoringTables = loadScoringTables(SCHEMA_ROOT)
  })

  it('loads more than 20 questions across 4 phases', () => {
    expect(allQuestions.length).toBeGreaterThan(20)
    const phases = new Set(allQuestions.map((q) => q.phase))
    expect(phases).toContain(1)
    expect(phases).toContain(2)
    expect(phases).toContain(3)
    expect(phases).toContain(4)
  })

  it('loads exactly 10 scoring tables (one per SpecScores dimension)', () => {
    expect(scoringTables.length).toBe(10)
  })

  it('a powder rider answers Phase 1–3 and the correct questions are shown', () => {
    const answers: Answers = {
      experience: 'advanced',
      style: 'powder',
      ridingDays: 30,
      terrain: { park: 0, groomed: 10, backcountry: 70, trees: 20 },
    }
    const partialScores: PartialScores = { flex: 6 }

    const visibleQuestions = allQuestions.filter((q) => {
      if (!q.showIf) return true
      return rules[q.showIf]?.(answers, partialScores) ?? false
    })

    const visibleIds = visibleQuestions.map((q) => q.id)
    expect(visibleIds).toContain('taper_preference')
    expect(visibleIds).toContain('backcountry_vs_resort')
    expect(visibleIds).not.toContain('park_feature_focus')
    expect(visibleIds).not.toContain('turn_radius')
  })

  it('a freestyle beginner does not see taper or backcountry questions', () => {
    const answers: Answers = {
      experience: 'beginner',
      style: 'freestyle',
      ridingDays: 5,
      terrain: { park: 80, groomed: 20, backcountry: 0, trees: 0 },
    }
    const partialScores: PartialScores = { flex: -2 }

    const visibleIds = allQuestions
      .filter((q) => {
        if (!q.showIf) return true
        return rules[q.showIf]?.(answers, partialScores) ?? false
      })
      .map((q) => q.id)

    expect(visibleIds).toContain('park_feature_focus')
    expect(visibleIds).not.toContain('taper_preference')
    expect(visibleIds).not.toContain('backcountry_vs_resort')
    expect(visibleIds).not.toContain('turn_radius')
  })

  it('flex score of 6 maps to Medium-Stiff label', () => {
    const flexTable = scoringTables.find((t) => t.dimension === 'flex')!
    const match = flexTable.mappings.find(
      (m) => 6 >= m.scoreRange[0] && 6 <= m.scoreRange[1]
    )
    expect(match?.label).toBe('Medium-Stiff')
  })

  it('taper score of 5 maps to High Taper', () => {
    const taperTable = scoringTables.find((t) => t.dimension === 'taper')!
    const match = taperTable.mappings.find(
      (m) => 5 >= m.scoreRange[0] && 5 <= m.scoreRange[1]
    )
    expect(match?.label).toBe('High Taper (25 mm)')
  })
})
```

- [ ] **Step 2: Run integration test**

```bash
cd 91_snowboard_wizard/packages/wizard-schema && pnpm test src/__tests__/integration.test.ts
```

Expected: All 6 integration tests passing.

- [ ] **Step 3: Run full test suite one final time**

```bash
cd 91_snowboard_wizard && pnpm turbo test
```

Expected: All tests across all packages pass.

- [ ] **Step 4: Final commit**

```bash
cd 91_snowboard_wizard
git add packages/wizard-schema/src/__tests__/integration.test.ts
git commit -m "feat: add wizard-schema integration tests — Plan 1 complete"
```
