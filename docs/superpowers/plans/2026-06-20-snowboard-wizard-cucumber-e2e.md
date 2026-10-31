# Snowboard Wizard — Cucumber E2E Framework Setup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and configure Cucumber.js in `apps/api/`, create all 14 feature files from the test suite spec, and write pending step-definition skeletons so `pnpm --filter @snowboard/api test:e2e` runs and reports every scenario as Pending (not Undefined, not Failed).

**Architecture:** Cucumber.js 11 with `ts-node/register` for TypeScript transformation, Supertest as the HTTP client, a shared `ApiWorld` class for cookie/captured-value management, and a `cucumber.js` profile config at `apps/api/cucumber.js`. Feature files live under `apps/api/test/e2e/features/`; step definitions under `apps/api/test/e2e/step-definitions/`; shared support under `apps/api/test/e2e/support/`. No HTTP calls are implemented in this plan — every step body returns `'pending'`.

**Tech Stack:** `@cucumber/cucumber@^11.0.0`, `supertest@^7.0.0`, `@types/supertest@^6.0.0`, `ts-node@^10.9.2` (new devDeps), TypeScript 5.6 (existing)

## Global Constraints

- All paths are relative to `91_snowboard_wizard/` (the monorepo root)
- All new files live under `apps/api/`
- TypeScript strict mode — `ApiWorld` properties fully typed, no `any`
- Every step definition body returns `'pending'` — zero HTTP calls in this plan
- `cucumber.js` default profile: `not @wip`; smoke profile: `@smoke and not @wip`
- `API_URL` env var sets base URL; falls back to `http://localhost:3001`
- `API_ORIGIN` env var sets CSRF origin; falls back to `http://localhost:3000`
- After every task: `pnpm --filter @snowboard/api test:e2e --dry-run` must exit 0

---

## File Map

**New files (created in this plan):**

```
apps/api/
├── cucumber.js                                  # Cucumber profile config
├── test/e2e/
│   ├── support/
│   │   ├── world.ts                             # ApiWorld class + setWorldConstructor
│   │   ├── hooks.ts                             # Before/After reset
│   │   └── fixtures.ts                          # Canned answer sets per rider archetype
│   ├── features/
│   │   ├── health.feature
│   │   ├── auth/
│   │   │   ├── google-login.feature
│   │   │   ├── token-refresh.feature
│   │   │   ├── logout.feature
│   │   │   └── me.feature
│   │   ├── scoring.feature
│   │   ├── sessions.feature
│   │   ├── recommendations/
│   │   │   ├── create.feature
│   │   │   ├── retrieve.feature
│   │   │   ├── share.feature
│   │   │   └── pdf.feature
│   │   └── journeys/
│   │       ├── guest-wizard-completion.feature
│   │       ├── authenticated-wizard-save-reload.feature
│   │       └── session-claim-on-login.feature
│   └── step-definitions/
│       ├── common.steps.ts                      # API calls + all assertion steps
│       ├── health.steps.ts                      # Health-specific Givens
│       ├── auth.steps.ts                        # Auth Givens + When/Thens
│       ├── scoring.steps.ts                     # Scoring Givens + When/Thens
│       ├── sessions.steps.ts                    # Session Givens + When/Thens
│       └── recommendations.steps.ts             # Recommendation Givens + When/Thens
```

**Modified files:**

```
apps/api/package.json      # add 3 devDeps + test:e2e / test:e2e:smoke scripts
```

---

### Task 1: Install dependencies + Cucumber config + npm scripts

**Files:**
- Modify: `apps/api/package.json` — add devDeps + scripts
- Create: `apps/api/cucumber.js` — Cucumber profile config

**Interfaces:**
- Produces: `pnpm --filter @snowboard/api test:e2e --dry-run` command available

- [ ] **Step 1: Add devDependencies to `apps/api/package.json`**

Add three entries to the `devDependencies` block (keep alphabetical order):

```json
"@cucumber/cucumber": "^11.0.0",
"@types/supertest": "^6.0.0",
"supertest": "^7.0.0",
"ts-node": "^10.9.2"
```

Full updated `devDependencies` block:

```json
"devDependencies": {
  "@cucumber/cucumber": "^11.0.0",
  "@nestjs/cli": "^10.0.0",
  "@nestjs/schematics": "^10.0.0",
  "@nestjs/testing": "^10.0.0",
  "@types/cookie-parser": "^1.4.6",
  "@types/express": "^5.0.6",
  "@types/jest": "^29.5.0",
  "@types/node": "^26.0.0",
  "@types/passport-jwt": "^4.0.0",
  "@types/pg": "^8.0.0",
  "@types/supertest": "^6.0.0",
  "@types/uuid": "^10.0.0",
  "jest": "^29.7.0",
  "supertest": "^7.0.0",
  "ts-jest": "^29.2.0",
  "ts-node": "^10.9.2",
  "typescript": "^5.6.0"
}
```

- [ ] **Step 2: Add `test:e2e` and `test:e2e:smoke` scripts to `apps/api/package.json`**

Add to the `scripts` block:

```json
"test:e2e": "cucumber-js",
"test:e2e:smoke": "cucumber-js --profile smoke"
```

Full updated `scripts` block:

```json
"scripts": {
  "build": "nest build",
  "dev": "nest start --watch",
  "migration:revert": "typeorm migration:revert -d dist/db/data-source.js",
  "migration:run": "typeorm migration:run -d dist/db/data-source.js",
  "start": "node dist/main",
  "test": "jest",
  "test:e2e": "cucumber-js",
  "test:e2e:smoke": "cucumber-js --profile smoke",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 3: Create `apps/api/cucumber.js`**

```javascript
// cucumber.js - Cucumber profile config
module.exports = {
  default: {
    paths: ['test/e2e/features/**/*.feature'],
    require: [
      'test/e2e/support/*.ts',
      'test/e2e/step-definitions/**/*.ts',
    ],
    requireModule: ['ts-node/register'],
    format: ['progress-bar'],
    tags: 'not @wip',
    publishQuiet: true,
  },
  smoke: {
    paths: ['test/e2e/features/**/*.feature'],
    require: [
      'test/e2e/support/*.ts',
      'test/e2e/step-definitions/**/*.ts',
    ],
    requireModule: ['ts-node/register'],
    format: ['progress-bar'],
    tags: '@smoke and not @wip',
    publishQuiet: true,
  },
}
```

- [ ] **Step 4: Install dependencies**

```bash
cd 91_snowboard_wizard
pnpm install
```

Expected: `Lockfile is up to date` or `packages installed`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/api/cucumber.js
git commit -m "chore: add Cucumber.js e2e framework — deps, config, scripts"
```

---

### Task 2: Support layer — World, hooks, fixtures

**Files:**
- Create: `apps/api/test/e2e/support/world.ts`
- Create: `apps/api/test/e2e/support/hooks.ts`
- Create: `apps/api/test/e2e/support/fixtures.ts`

**Interfaces:**
- Produces:
  ```typescript
  class ApiWorld extends World {
    response: StoredResponse | null
    capturedValues: Record<string, string>
    cookies: string
    skipCsrfOrigin: boolean
    getField(obj: unknown, path: string): unknown
    resolve(text: string): string
    // no HTTP methods yet — added in Task 6
  }
  type RiderFixture = { answers: Record<string, unknown>; label: string }
  FIXTURES: Record<string, RiderFixture>  // 'allMountainIntermediate' | 'powderExpert' | 'freestyleBeginner'
  ```

- [ ] **Step 1: Create `apps/api/test/e2e/support/world.ts`**

```typescript
// world.ts - Shared test state passed between Cucumber steps
import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber'

export interface StoredResponse {
  status: number
  body: unknown
  headers: Record<string, string | string[]>
}

export class ApiWorld extends World {
  readonly baseUrl: string
  readonly apiOrigin: string
  response: StoredResponse | null = null
  capturedValues: Record<string, string> = {}
  // Raw cookie header string built up across responses
  cookies: string = ''
  // Set to true in CSRF test steps before the next HTTP call
  skipCsrfOrigin: boolean = false

  constructor(options: IWorldOptions) {
    super(options)
    this.baseUrl = process.env.API_URL ?? 'http://localhost:3001'
    this.apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:3000'
  }

  /**
   * Read a nested field using dot-notation from any object.
   * Returns undefined if any segment is missing.
   */
  getField(obj: unknown, path: string): unknown {
    return path.split('.').reduce((acc: unknown, key: string) => {
      if (acc == null || typeof acc !== 'object') return undefined
      return (acc as Record<string, unknown>)[key]
    }, obj)
  }

  /**
   * Replace <var-name> placeholders with values stored in capturedValues.
   * Used in journey scenarios where a step captures a value and later steps reference it.
   */
  resolve(text: string): string {
    return text.replace(/<([^>]+)>/g, (_match: string, name: string) => {
      return this.capturedValues[name] ?? `<${name}>`
    })
  }

  /** Store a Set-Cookie header's name=value pairs into the cookie jar. */
  storeSetCookie(setCookieHeader: string | string[] | undefined): void {
    if (!setCookieHeader) return
    const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const pairs = headers.map(h => h.split(';')[0].trim())
    // Merge: replace existing cookies with same name, add new ones
    const jar: Record<string, string> = {}
    if (this.cookies) {
      this.cookies.split('; ').forEach(pair => {
        const [name] = pair.split('=')
        jar[name] = pair
      })
    }
    pairs.forEach(pair => {
      const [name] = pair.split('=')
      jar[name] = pair
    })
    this.cookies = Object.values(jar).join('; ')
  }

  /** Remove a named cookie from the jar (simulates a cleared cookie). */
  clearCookie(name: string): void {
    const parts = this.cookies
      .split('; ')
      .filter(pair => !pair.startsWith(`${name}=`))
    this.cookies = parts.join('; ')
  }

  /** Build the default CSRF origin header for state-changing requests. */
  csrfOrigin(): string | undefined {
    return this.skipCsrfOrigin ? undefined : this.apiOrigin
  }
}

setWorldConstructor(ApiWorld)
```

- [ ] **Step 2: Create `apps/api/test/e2e/support/hooks.ts`**

```typescript
// hooks.ts - Cucumber Before/After lifecycle hooks
import { Before, After } from '@cucumber/cucumber'
import type { ApiWorld } from './world'

// Reset all per-scenario state before each scenario
Before(function(this: ApiWorld) {
  this.response = null
  this.capturedValues = {}
  this.cookies = ''
  this.skipCsrfOrigin = false
})

// Nothing to tear down yet — HTTP calls against a real server clean up themselves.
// When step implementations land, add DB/Redis cleanup here.
After(function(this: ApiWorld) {
  // placeholder — implementations will add cleanup per scenario tag
})
```

- [ ] **Step 3: Create `apps/api/test/e2e/support/fixtures.ts`**

```typescript
// fixtures.ts - Canned answer sets for common rider archetypes
// Used in step definitions to avoid repeating large JSON bodies

export interface RiderFixture {
  label: string
  answers: Record<string, unknown>
}

export const FIXTURES: Record<string, RiderFixture> = {
  allMountainIntermediate: {
    label: 'Intermediate all-mountain rider',
    answers: {
      experience: 'intermediate',
      style: 'all-mountain',
      weightCategory: 'w_71_85',
      stance: 'regular',
      terrainMix: 'mixed',
      snowConditions: 'mixed',
    },
  },
  powderExpert: {
    label: 'Expert powder / freeride rider',
    answers: {
      experience: 'expert',
      style: 'powder',
      weightCategory: 'over_100',
      stance: 'regular',
      terrainMix: 'mostly_backcountry',
      snowConditions: 'powder',
      taperPreference: 'high_taper',
    },
  },
  freestyleBeginner: {
    label: 'Beginner freestyle rider',
    answers: {
      experience: 'beginner',
      style: 'freestyle',
      weightCategory: 'w_56_70',
      stance: 'goofy',
      terrainMix: 'park',
      snowConditions: 'mixed',
    },
  },
  carvingAdvanced: {
    label: 'Advanced carving rider',
    answers: {
      experience: 'advanced',
      style: 'carving',
      weightCategory: 'w_86_100',
      stance: 'regular',
      terrainMix: 'groomed',
      snowConditions: 'hardpack',
      turnRadius: 'long_arc',
    },
  },
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api exec npx ts-node --project tsconfig.json --transpile-only apps/api/test/e2e/support/world.ts
```

Expected: exits 0 with no output (or a ts-node warning about `require` — that is fine).

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/e2e/support/
git commit -m "chore: Cucumber e2e support layer — ApiWorld, hooks, rider fixtures"
```

---

### Task 3: Feature files — Health + Auth (5 files)

**Files:**
- Create: `apps/api/test/e2e/features/health.feature`
- Create: `apps/api/test/e2e/features/auth/google-login.feature`
- Create: `apps/api/test/e2e/features/auth/token-refresh.feature`
- Create: `apps/api/test/e2e/features/auth/logout.feature`
- Create: `apps/api/test/e2e/features/auth/me.feature`

**Interfaces:**
- Consumes: nothing (pure Gherkin)
- Produces: 24 scenarios (5 health + 7 google-login + 5 refresh + 3 logout + 4 me)

- [ ] **Step 1: Create `apps/api/test/e2e/features/health.feature`**

```gherkin
Feature: API health check
  As an operator
  I want to verify the API and its dependencies are healthy
  So that I can detect outages before users do

  Background:
    Given the API is running
    And PostgreSQL is reachable
    And Redis is reachable

  @smoke
  Scenario: All dependencies healthy
    When I send GET /api/health
    Then the response status is 200
    And the response body field "status" is "ok"
    And the response body field "checks.postgresql.status" is "ok"
    And the response body field "checks.redis.status" is "ok"
    And the response body field "checks.anthropic.status" is "ok"
    And the response body field "checks.google.status" is "ok"

  Scenario: PostgreSQL is unreachable
    Given PostgreSQL is not reachable
    When I send GET /api/health
    Then the response status is 503
    And the response body field "checks.postgresql.status" is "error"
    And the response body field "status" is "ok"

  Scenario: Redis is unreachable
    Given Redis is not reachable
    When I send GET /api/health
    Then the response status is 503
    And the response body field "checks.redis.status" is "error"

  Scenario: Anthropic API key is missing or invalid
    Given the ANTHROPIC_API_KEY environment variable is empty
    When I send GET /api/health
    Then the response status is 200
    And the response body field "checks.anthropic.status" is "error"

  Scenario: Google client ID is invalid
    Given the GOOGLE_CLIENT_ID environment variable is set to an invalid value
    When I send GET /api/health
    Then the response status is 200
    And the response body field "checks.google.status" is "error"
```

- [ ] **Step 2: Create `apps/api/test/e2e/features/auth/google-login.feature`**

```gherkin
Feature: Google OAuth login
  As a user who has completed the wizard
  I want to log in with my Google account
  So that I can save and revisit my recommendations

  Background:
    Given the API is running
    And a valid Google ID token exists for "alice@example.com"

  @smoke @auth
  Scenario: First-time login creates a new user account
    When I send POST /api/auth/google with body:
      | idToken | <valid-google-id-token> |
    Then the response status is 200
    And the response body field "email" is "alice@example.com"
    And the response body field "userId" is a non-empty UUID
    And the response sets an httpOnly cookie named "access_token"
    And the response sets an httpOnly cookie named "refresh_token"
    And a user record for "alice@example.com" exists in the database

  @auth
  Scenario: Repeat login updates name and avatar but does not create a duplicate user
    Given a user with Google ID "g-alice" already exists
    And that user's name is "Alice Old"
    When I send POST /api/auth/google with body:
      | idToken | <valid-google-id-token-for-alice-with-name-Alice-New> |
    Then the response status is 200
    And only one user record for "alice@example.com" exists in the database
    And that user's name is "Alice New"

  @auth
  Scenario: Login with an invalid Google ID token is rejected
    When I send POST /api/auth/google with body:
      | idToken | not-a-real-google-token |
    Then the response status is 401
    And no auth cookies are set

  @auth
  Scenario: Login with a missing idToken field is rejected
    When I send POST /api/auth/google with an empty body
    Then the response status is 400
    And no auth cookies are set

  @security
  Scenario: Login without a matching Origin header is rejected (CSRF)
    Given the next request will have no Origin or Referer header
    When I send POST /api/auth/google with body:
      | idToken | <valid-google-id-token> |
    Then the response status is 403

  @auth
  Scenario: Login with a guest session ID claims the guest session
    Given a guest wizard session exists with id "guest-session-uuid"
    When I send POST /api/auth/google with body:
      | idToken        | <valid-google-id-token>  |
      | guestSessionId | guest-session-uuid       |
    Then the response status is 200
    And the wizard session "guest-session-uuid" is now associated with the logged-in user

  @auth
  Scenario: Login with an unrecognised guest session ID succeeds without error
    When I send POST /api/auth/google with body:
      | idToken        | <valid-google-id-token>   |
      | guestSessionId | non-existent-session-id   |
    Then the response status is 200
    And the response body field "userId" is a non-empty UUID
```

- [ ] **Step 3: Create `apps/api/test/e2e/features/auth/token-refresh.feature`**

```gherkin
Feature: Access token refresh
  As an authenticated user
  I want my session to be silently renewed
  So that I stay logged in without re-authenticating

  Background:
    Given the API is running
    And I am logged in as "alice@example.com"

  @smoke @auth
  Scenario: Valid refresh token issues a new access token
    Given my "refresh_token" cookie is valid and not expired
    When I send POST /api/auth/refresh
    Then the response status is 200
    And the response sets a new httpOnly "access_token" cookie
    And the response body field "ok" is "true"

  @auth @security
  Scenario: Missing refresh token cookie is rejected
    Given my "refresh_token" cookie is not present
    When I send POST /api/auth/refresh
    Then the response status is 401

  @auth @security
  Scenario: Tampered refresh token is rejected
    Given my "refresh_token" cookie value has been corrupted
    When I send POST /api/auth/refresh
    Then the response status is 401

  @auth @security
  Scenario: Expired refresh token is rejected
    Given my "refresh_token" was issued 31 days ago
    When I send POST /api/auth/refresh
    Then the response status is 401

  @security
  Scenario: Refresh without Origin header is rejected (CSRF)
    Given the next request will have no Origin or Referer header
    When I send POST /api/auth/refresh
    Then the response status is 403
```

- [ ] **Step 4: Create `apps/api/test/e2e/features/auth/logout.feature`**

```gherkin
Feature: Logout
  As an authenticated user
  I want to log out
  So that my session is terminated across all devices

  Background:
    Given the API is running
    And I am logged in as "alice@example.com"

  @smoke @auth
  Scenario: Logout clears auth cookies and invalidates the refresh token
    Given I have a valid refresh token in my cookie jar
    When I send POST /api/auth/logout
    Then the response status is 200
    And the "access_token" cookie is cleared
    And the "refresh_token" cookie is cleared
    And the refresh token can no longer be used to refresh the session

  @auth
  Scenario: Logout without a refresh token cookie still succeeds
    Given I have no refresh token cookie
    When I send POST /api/auth/logout
    Then the response status is 200
    And the response body field "ok" is "true"

  @security
  Scenario: Logout without Origin header is rejected (CSRF)
    Given the next request will have no Origin or Referer header
    When I send POST /api/auth/logout
    Then the response status is 403
```

- [ ] **Step 5: Create `apps/api/test/e2e/features/auth/me.feature`**

```gherkin
Feature: Current user profile
  As an authenticated user
  I want to retrieve my profile
  So that the frontend can display my account details

  Background:
    Given the API is running

  @smoke @auth
  Scenario: Authenticated user retrieves their profile
    Given I am logged in as "alice@example.com" with name "Alice"
    When I send GET /api/auth/me with my access token
    Then the response status is 200
    And the response body field "email" is "alice@example.com"
    And the response body field "name" is "Alice"
    And the response body field "id" is a non-empty UUID
    And the response body does not contain the field "googleId"

  @auth
  Scenario: Unauthenticated request is rejected
    When I send GET /api/auth/me without auth credentials
    Then the response status is 401

  @auth @security
  Scenario: Request with a tampered access token is rejected
    When I send GET /api/auth/me with a tampered JWT in the Authorization header
    Then the response status is 401

  @auth @security
  Scenario: Request with an expired access token is rejected
    Given my access token expired 1 minute ago
    When I send GET /api/auth/me with my access token
    Then the response status is 401
```

- [ ] **Step 6: Dry-run to verify feature files are valid Gherkin**

```bash
cd 91_snowboard_wizard/apps/api
npx cucumber-js --dry-run --require-module ts-node/register --require 'test/e2e/support/*.ts' test/e2e/features/health.feature test/e2e/features/auth/*.feature 2>&1 | head -30
```

Expected: lists all scenarios with "Undefined" steps — no parse errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/test/e2e/features/health.feature apps/api/test/e2e/features/auth/
git commit -m "test(e2e): feature files — health and auth (24 scenarios)"
```

---

### Task 4: Feature files — Scoring + Sessions + Recommendations (6 files)

**Files:**
- Create: `apps/api/test/e2e/features/scoring.feature`
- Create: `apps/api/test/e2e/features/sessions.feature`
- Create: `apps/api/test/e2e/features/recommendations/create.feature`
- Create: `apps/api/test/e2e/features/recommendations/retrieve.feature`
- Create: `apps/api/test/e2e/features/recommendations/share.feature`
- Create: `apps/api/test/e2e/features/recommendations/pdf.feature`

**Interfaces:**
- Produces: 29 additional scenarios

- [ ] **Step 1: Create `apps/api/test/e2e/features/scoring.feature`**

```gherkin
Feature: Incremental wizard scoring
  As a wizard user
  I want my answers to be scored in real time
  So that the live profile sidebar updates after each selection

  Background:
    Given the API is running

  @smoke
  Scenario: Empty answers return all-zero partial scores
    When I send POST /api/score with JSON body:
      """
      {}
      """
    Then the response status is 200
    And the response body field "scores.flex" is the number 0
    And the response body field "scores.length" is the number 0
    And the response body field "scores.camber" is the number 0

  Scenario: Powder riding style produces positive taper, float and shape scores
    When I send POST /api/score with JSON body:
      """
      { "style": "powder" }
      """
    Then the response status is 200
    And the response body field "scores.taper" is greater than 0
    And the response body field "scores.float" is greater than 0
    And the response body field "scores.shape" is greater than 0

  Scenario: Freestyle riding style produces a negative flex score
    When I send POST /api/score with JSON body:
      """
      { "style": "freestyle" }
      """
    Then the response status is 200
    And the response body field "scores.flex" is less than 0

  Scenario: Carving riding style produces a positive camber score
    When I send POST /api/score with JSON body:
      """
      { "style": "carving" }
      """
    Then the response status is 200
    And the response body field "scores.camber" is greater than 0

  Scenario: Beginner experience reduces flex score
    When I send POST /api/score with JSON body:
      """
      { "experience": "beginner" }
      """
    Then the response status is 200
    And the response body field "scores.flex" is less than 0

  Scenario Outline: Weight category influences length and flex scores
    When I send POST /api/score with JSON body:
      """
      { "weightCategory": "<weight>" }
      """
    Then the response body field "scores.length" is <length_dir> 0
    And the response body field "scores.flex" is <flex_dir> 0

    Examples:
      | weight    | length_dir   | flex_dir     |
      | under_55  | less than     | less than    |
      | over_100  | greater than  | greater than |

  @security
  Scenario: POST /score without Origin header is rejected (CSRF)
    Given the next request will have no Origin or Referer header
    When I send POST /api/score with JSON body:
      """
      {}
      """
    Then the response status is 403

  Scenario: Non-object answers field returns 400
    When I send POST /api/score with JSON body:
      """
      { "answers": "not-an-object" }
      """
    Then the response status is 400

  Scenario: Missing answers field returns 400
    When I send POST /api/score with an empty body
    Then the response status is 400
```

- [ ] **Step 2: Create `apps/api/test/e2e/features/sessions.feature`**

```gherkin
Feature: In-progress wizard session cache
  As a wizard user
  I want my partial answers cached between page loads
  So that I can resume a session without losing progress

  Background:
    Given the API is running

  @smoke
  Scenario: Save wizard answers and phase to cache
    When I send PUT /api/sessions/my-session-id with JSON body:
      """
      {
        "answers": { "style": "powder", "experience": "intermediate" },
        "phase": 2
      }
      """
    Then the response status is 200

  @smoke
  Scenario: Retrieve previously saved wizard answers
    Given I have saved session "my-session-id" with answers and phase 2:
      """
      { "style": "powder" }
      """
    When I send GET /api/sessions/my-session-id
    Then the response status is 200
    And the response body field "answers.style" is "powder"
    And the response body field "phase" is the number 2

  Scenario: Retrieving a non-existent session returns null
    When I send GET /api/sessions/does-not-exist
    Then the response status is 200
    And the response body is null

  Scenario: Overwriting a session replaces the previous answers
    Given I have saved session "my-session-id" with answers and phase 1:
      """
      { "style": "powder" }
      """
    When I send PUT /api/sessions/my-session-id with JSON body:
      """
      {
        "answers": { "style": "carving", "experience": "advanced" },
        "phase": 2
      }
      """
    And I send GET /api/sessions/my-session-id
    Then the response body field "answers.style" is "carving"
    And the response body field "phase" is the number 2

  Scenario: Saved session expires after 7 days
    Given I have saved session "expiring-session" 7 days and 1 second ago
    When I send GET /api/sessions/expiring-session
    Then the response body is null

  Scenario: PUT /sessions/:id with phase above 4 returns 400
    When I send PUT /api/sessions/my-session-id with JSON body:
      """
      { "answers": {}, "phase": 5 }
      """
    Then the response status is 400

  Scenario: PUT /sessions/:id with phase below 1 returns 400
    When I send PUT /api/sessions/my-session-id with JSON body:
      """
      { "answers": {}, "phase": 0 }
      """
    Then the response status is 400

  Scenario: PUT /sessions/:id with non-object answers returns 400
    When I send PUT /api/sessions/my-session-id with JSON body:
      """
      { "answers": "oops", "phase": 1 }
      """
    Then the response status is 400
```

- [ ] **Step 3: Create `apps/api/test/e2e/features/recommendations/create.feature`**

```gherkin
Feature: Create a recommendation
  As a user who has completed the wizard
  I want to generate a recommendation from my answers
  So that I receive a spec sheet and personalized narrative

  Background:
    Given the API is running

  @smoke
  Scenario: Guest user creates a recommendation
    When I send POST /api/recommendations with JSON body:
      """
      {
        "answers": {
          "experience": "intermediate",
          "style": "all-mountain",
          "weightCategory": "w_71_85"
        }
      }
      """
    Then the response status is 201
    And the response body field "id" is a non-empty UUID
    And the response body field "shareToken" matches the pattern "^[A-Za-z0-9_-]{43,}$"
    And the response body field "specSheet.flexRating" is a number between 1 and 10
    And the response body field "specSheet.flexLabel" is one of "Soft,Medium,Medium-Stiff,Stiff"
    And the response body field "specSheet.lengthCm" is a number between 130 and 175
    And the response body field "specSheet.shape" is one of "twin,directional-twin,directional,tapered-directional"
    And the response body field "specSheet.camberProfile" is one of "camber,rocker,hybrid,flat"
    And the response body field "specSheet.baseType" is one of "sintered,extruded"
    And the response body field "claudeNarrative" is a non-empty string

  Scenario: Authenticated user creates a recommendation linked to their account
    Given I am logged in as "alice@example.com"
    When I send POST /api/recommendations with my access token and JSON body:
      """
      {
        "answers": { "style": "freeride", "experience": "expert" },
        "sessionName": "Powder quiver 2026"
      }
      """
    Then the response status is 201
    And the wizard session for this recommendation is associated with "alice@example.com"
    And the session name is "Powder quiver 2026"

  Scenario: Recommendation with empty answers returns a valid spec sheet
    When I send POST /api/recommendations with JSON body:
      """
      { "answers": {} }
      """
    Then the response status is 201
    And the response body field "specSheet.flexLabel" is a non-empty string

  @security
  Scenario: Two recommendations from identical answers have different share tokens
    When I send POST /api/recommendations with JSON body:
      """
      { "answers": { "style": "powder" } }
      """
    And I capture the "shareToken" from the response as "token-one"
    And I send POST /api/recommendations with JSON body:
      """
      { "answers": { "style": "powder" } }
      """
    And I capture the "shareToken" from the response as "token-two"
    Then the captured values "token-one" and "token-two" are different
    And the captured value "token-one" matches the pattern "^[A-Za-z0-9_-]+$"
    And the captured value "token-two" matches the pattern "^[A-Za-z0-9_-]+$"

  @security
  Scenario: POST /recommendations without Origin header is rejected (CSRF)
    Given the next request will have no Origin or Referer header
    When I send POST /api/recommendations with JSON body:
      """
      { "answers": {} }
      """
    Then the response status is 403

  Scenario: POST /recommendations with missing answers field returns 400
    When I send POST /api/recommendations with JSON body:
      """
      { "sessionName": "no answers" }
      """
    Then the response status is 400

  Scenario: POST /recommendations with non-object answers returns 400
    When I send POST /api/recommendations with JSON body:
      """
      { "answers": 42 }
      """
    Then the response status is 400
```

- [ ] **Step 4: Create `apps/api/test/e2e/features/recommendations/retrieve.feature`**

```gherkin
Feature: Retrieve a recommendation by ID
  As an authenticated user
  I want to fetch my saved recommendation
  So that I can review or share my spec sheet

  Background:
    Given the API is running
    And a recommendation exists in the database with id "rec-uuid" belonging to "alice@example.com"

  @smoke @auth
  Scenario: Owner retrieves their recommendation
    Given I am logged in as "alice@example.com"
    When I send GET /api/recommendations/rec-uuid with my access token
    Then the response status is 200
    And the response body field "id" is "rec-uuid"
    And the response body field "specSheet" is an object
    And the response body field "claudeNarrative" is a non-empty string
    And the response body field "shareToken" is a non-empty string

  @auth
  Scenario: Unauthenticated request is rejected
    When I send GET /api/recommendations/rec-uuid without auth credentials
    Then the response status is 401

  Scenario: Non-existent recommendation ID returns 404
    Given I am logged in as "alice@example.com"
    When I send GET /api/recommendations/00000000-0000-0000-0000-000000000000 with my access token
    Then the response status is 404

  Scenario: Invalid UUID format returns 400
    Given I am logged in as "alice@example.com"
    When I send GET /api/recommendations/not-a-uuid with my access token
    Then the response status is 400
```

- [ ] **Step 5: Create `apps/api/test/e2e/features/recommendations/share.feature`**

```gherkin
Feature: Access a recommendation via share token
  As anyone with a share link
  I want to view a recommendation without logging in
  So that I can see the spec sheet a friend shared with me

  Background:
    Given the API is running
    And a recommendation exists in the database with shareToken "test-share-token-abc123"

  @smoke
  Scenario: Anyone can view a recommendation by share token without auth
    When I send GET /api/recommendations/share/test-share-token-abc123 without auth credentials
    Then the response status is 200
    And the response body field "specSheet" is an object
    And the response body field "claudeNarrative" is a non-empty string
    And the response body field "shareToken" is "test-share-token-abc123"

  Scenario: Unknown share token returns 404
    When I send GET /api/recommendations/share/does-not-exist without auth credentials
    Then the response status is 404

  Scenario: Share endpoint does not expose the owner's user ID
    When I send GET /api/recommendations/share/test-share-token-abc123 without auth credentials
    Then the response body does not contain the field "session.userId"
```

- [ ] **Step 6: Create `apps/api/test/e2e/features/recommendations/pdf.feature`**

```gherkin
Feature: PDF export of a recommendation
  As a user
  I want to download my recommendation as a PDF
  So that I can print it to take to a shop

  Background:
    Given the API is running

  Scenario: PDF endpoint returns 501 Not Implemented
    When I send GET /api/recommendations/00000000-0000-0000-0000-000000000001/pdf
    Then the response status is 501
```

- [ ] **Step 7: Dry-run all six new files**

```bash
cd 91_snowboard_wizard/apps/api
npx cucumber-js --dry-run --require-module ts-node/register --require 'test/e2e/support/*.ts' \
  test/e2e/features/scoring.feature \
  test/e2e/features/sessions.feature \
  test/e2e/features/recommendations/*.feature 2>&1 | tail -10
```

Expected: all scenarios listed as `Undefined` — no parse errors.

- [ ] **Step 8: Commit**

```bash
git add apps/api/test/e2e/features/scoring.feature \
        apps/api/test/e2e/features/sessions.feature \
        apps/api/test/e2e/features/recommendations/
git commit -m "test(e2e): feature files — scoring, sessions, recommendations (29 scenarios)"
```

---

### Task 5: Feature files — Journeys (3 files)

**Files:**
- Create: `apps/api/test/e2e/features/journeys/guest-wizard-completion.feature`
- Create: `apps/api/test/e2e/features/journeys/authenticated-wizard-save-reload.feature`
- Create: `apps/api/test/e2e/features/journeys/session-claim-on-login.feature`

**Interfaces:**
- Produces: 4 additional scenarios (2 smoke journey + 2 session-claim)

- [ ] **Step 1: Create `apps/api/test/e2e/features/journeys/guest-wizard-completion.feature`**

```gherkin
Feature: Guest wizard completion end-to-end
  As a visitor who has not logged in
  I want to complete the wizard, get a recommendation, and share it
  Without needing to create an account

  @smoke @journey
  Scenario: Guest completes all wizard phases and receives a shareable recommendation
    Given the API is running
    And I have no auth credentials

    # Phase 1 — Rider Profile scoring
    When I send POST /api/score with JSON body:
      """
      { "experience": "intermediate", "weightCategory": "w_71_85", "stance": "regular" }
      """
    Then the response status is 200
    And the response body field "scores.flex" is a number

    # Cache progress after Phase 1
    When I send PUT /api/sessions/guest-journey-session with JSON body:
      """
      { "answers": { "experience": "intermediate", "weightCategory": "w_71_85" }, "phase": 1 }
      """
    Then the response status is 200

    # Phase 2 — Style scoring
    When I send POST /api/score with JSON body:
      """
      {
        "experience": "intermediate",
        "weightCategory": "w_71_85",
        "style": "all-mountain",
        "terrainMix": "mixed"
      }
      """
    Then the response status is 200

    # Phase 3 — Deep Dive scoring
    When I send POST /api/score with JSON body:
      """
      {
        "experience": "intermediate",
        "weightCategory": "w_71_85",
        "style": "all-mountain",
        "terrainMix": "mixed",
        "speedPreference": "moderate"
      }
      """
    Then the response status is 200

    # Generate recommendation
    When I send POST /api/recommendations with JSON body:
      """
      {
        "answers": {
          "experience": "intermediate",
          "weightCategory": "w_71_85",
          "style": "all-mountain"
        }
      }
      """
    Then the response status is 201
    And I capture the "shareToken" from the response as "my-share-token"
    And I capture the "id" from the response as "my-rec-id"

    # Share link is publicly accessible
    When I send GET /api/recommendations/share/<my-share-token> without auth credentials
    Then the response status is 200
    And the response body field "specSheet.shape" is a non-empty string

    # Direct ID access without auth is blocked
    When I send GET /api/recommendations/<my-rec-id> without auth credentials
    Then the response status is 401
```

- [ ] **Step 2: Create `apps/api/test/e2e/features/journeys/authenticated-wizard-save-reload.feature`**

```gherkin
Feature: Authenticated wizard — save and reload mid-session
  As a logged-in user
  I want to save my wizard progress and reload it after closing the tab
  So that I can pick up where I left off

  @journey
  Scenario: User saves progress mid-wizard and reloads their answers
    Given the API is running
    And I am logged in as "bob@example.com"

    # Save progress mid-wizard
    When I send PUT /api/sessions/bob-journey-session with JSON body:
      """
      { "answers": { "experience": "advanced", "style": "freeride" }, "phase": 2 }
      """
    Then the response status is 200

    # Simulate tab close + reopen — fetch from cache
    When I send GET /api/sessions/bob-journey-session
    Then the response status is 200
    And the response body field "answers.experience" is "advanced"
    And the response body field "answers.style" is "freeride"
    And the response body field "phase" is the number 2

    # Complete the wizard
    When I send POST /api/recommendations with my access token and JSON body:
      """
      {
        "answers": { "experience": "advanced", "style": "freeride", "weightCategory": "w_86_100" },
        "sessionName": "Freeride setup"
      }
      """
    Then the response status is 201
    And I capture the "id" from the response as "bob-rec-id"

    # Retrieve by ID (JWT-guarded)
    When I send GET /api/recommendations/<bob-rec-id> with my access token
    Then the response status is 200
    And the response body field "specSheet.shape" is one of "twin,directional-twin,directional,tapered-directional"
```

- [ ] **Step 3: Create `apps/api/test/e2e/features/journeys/session-claim-on-login.feature`**

```gherkin
Feature: Guest session claimed on first login
  As a guest user who completed the wizard before creating an account
  I want my anonymous session to be associated with my new account when I log in
  So that I do not lose my recommendation history

  @journey @security
  Scenario: Guest session is claimed and cannot be re-claimed by another user
    Given the API is running
    And a guest wizard session exists with id "claimable-session-id"
    And that session belongs to no user

    # First login claims the session
    When I send POST /api/auth/google with body:
      | idToken        | <valid-google-id-token-for-carol@example.com> |
      | guestSessionId | claimable-session-id                          |
    Then the response status is 200
    And I capture the "userId" from the response as "carol-user-id"
    And the wizard session "claimable-session-id" is now associated with user id "carol-user-id"

    # Second user attempting to claim the already-claimed session does not hijack it
    When I send POST /api/auth/google with body:
      | idToken        | <valid-google-id-token-for-dave@example.com> |
      | guestSessionId | claimable-session-id                         |
    Then the response status is 200
    And the wizard session "claimable-session-id" still belongs to user id "carol-user-id"

  @journey
  Scenario: Login without guestSessionId does not affect existing unclaimed sessions
    Given the API is running
    And a guest wizard session exists with id "unclaimed-session-id"
    And that session belongs to no user
    When I send POST /api/auth/google with body:
      | idToken | <valid-google-id-token-for-eve@example.com> |
    Then the response status is 200
    And the wizard session "unclaimed-session-id" still belongs to no user
```

- [ ] **Step 4: Dry-run all journey files**

```bash
cd 91_snowboard_wizard/apps/api
npx cucumber-js --dry-run --require-module ts-node/register --require 'test/e2e/support/*.ts' \
  test/e2e/features/journeys/*.feature 2>&1 | tail -15
```

Expected: all scenarios listed as `Undefined` — no parse errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/e2e/features/journeys/
git commit -m "test(e2e): feature files — 3 cross-cutting journey scenarios"
```

---

### Task 6: Step definition skeletons — common + health

**Files:**
- Create: `apps/api/test/e2e/step-definitions/common.steps.ts`
- Create: `apps/api/test/e2e/step-definitions/health.steps.ts`

**Interfaces:**
- Consumes: `ApiWorld` from `../support/world`
- Produces: all shared Given/When/Then patterns used across every feature file — each body returns `'pending'`

- [ ] **Step 1: Create `apps/api/test/e2e/step-definitions/common.steps.ts`**

```typescript
// common.steps.ts - Shared step definitions: HTTP calls, assertions, cookie helpers
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

// ── Setup / Context ──────────────────────────────────────────────────────────

Given('the API is running', async function(this: ApiWorld) {
  return 'pending'
})

Given('I have no auth credentials', function(this: ApiWorld) {
  return 'pending'
})

Given('the next request will have no Origin or Referer header', function(this: ApiWorld) {
  return 'pending'
})

// ── GET requests ─────────────────────────────────────────────────────────────

When('I send GET {string}', async function(this: ApiWorld, _path: string) {
  return 'pending'
})

When('I send GET {string} without auth credentials', async function(this: ApiWorld, _path: string) {
  return 'pending'
})

When('I send GET {string} with my access token', async function(this: ApiWorld, _path: string) {
  return 'pending'
})

When('I send GET {string} with a tampered JWT in the Authorization header', async function(this: ApiWorld, _path: string) {
  return 'pending'
})

// Intercept bare path steps used in feature files (e.g. "I send GET /api/health")
When('I send GET /api/health', async function(this: ApiWorld) {
  return 'pending'
})

When('I send GET /api/auth/me with my access token', async function(this: ApiWorld) {
  return 'pending'
})

When('I send GET /api/auth/me without auth credentials', async function(this: ApiWorld) {
  return 'pending'
})

When('I send GET /api/auth/me with a tampered JWT in the Authorization header', async function(this: ApiWorld) {
  return 'pending'
})

When(/^I send GET \/api\/sessions\/(.+)$/, async function(this: ApiWorld, _id: string) {
  return 'pending'
})

When(/^I send GET \/api\/recommendations\/(.+)\/pdf$/, async function(this: ApiWorld, _id: string) {
  return 'pending'
})

When(/^I send GET \/api\/recommendations\/share\/(.+) without auth credentials$/, async function(this: ApiWorld, _token: string) {
  return 'pending'
})

When(/^I send GET \/api\/recommendations\/(.+) without auth credentials$/, async function(this: ApiWorld, _id: string) {
  return 'pending'
})

When(/^I send GET \/api\/recommendations\/(.+) with my access token$/, async function(this: ApiWorld, _id: string) {
  return 'pending'
})

// ── POST requests ─────────────────────────────────────────────────────────────

When('I send POST /api/auth/google with body:', async function(this: ApiWorld, table: DataTable) {
  return 'pending'
})

When('I send POST /api/auth/google with an empty body', async function(this: ApiWorld) {
  return 'pending'
})

When('I send POST /api/auth/refresh', async function(this: ApiWorld) {
  return 'pending'
})

When('I send POST /api/auth/refresh with no Origin or Referer header', async function(this: ApiWorld) {
  return 'pending'
})

When('I send POST /api/auth/logout', async function(this: ApiWorld) {
  return 'pending'
})

When('I send POST /api/score with JSON body:', async function(this: ApiWorld, body: string) {
  return 'pending'
})

When('I send POST /api/score with an empty body', async function(this: ApiWorld) {
  return 'pending'
})

When('I send POST /api/recommendations with JSON body:', async function(this: ApiWorld, body: string) {
  return 'pending'
})

When('I send POST /api/recommendations with my access token and JSON body:', async function(this: ApiWorld, body: string) {
  return 'pending'
})

// ── PUT requests ──────────────────────────────────────────────────────────────

When(/^I send PUT \/api\/sessions\/(.+) with JSON body:$/, async function(this: ApiWorld, _id: string, body: string) {
  return 'pending'
})

// ── Response assertions ───────────────────────────────────────────────────────

Then('the response status is {int}', function(this: ApiWorld, _expectedStatus: number) {
  return 'pending'
})

Then('the response body field {string} is {string}', function(this: ApiWorld, _field: string, _value: string) {
  return 'pending'
})

Then('the response body field {string} is the number {int}', function(this: ApiWorld, _field: string, _value: number) {
  return 'pending'
})

Then('the response body field {string} is greater than {int}', function(this: ApiWorld, _field: string, _threshold: number) {
  return 'pending'
})

Then('the response body field {string} is less than {int}', function(this: ApiWorld, _field: string, _threshold: number) {
  return 'pending'
})

Then('the response body field {string} is a non-empty string', function(this: ApiWorld, _field: string) {
  return 'pending'
})

Then('the response body field {string} is a non-empty UUID', function(this: ApiWorld, _field: string) {
  return 'pending'
})

Then('the response body field {string} is a number', function(this: ApiWorld, _field: string) {
  return 'pending'
})

Then('the response body field {string} is a number between {int} and {int}', function(this: ApiWorld, _field: string, _min: number, _max: number) {
  return 'pending'
})

Then('the response body field {string} is an object', function(this: ApiWorld, _field: string) {
  return 'pending'
})

Then('the response body field {string} matches the pattern {string}', function(this: ApiWorld, _field: string, _pattern: string) {
  return 'pending'
})

Then('the response body field {string} is one of {string}', function(this: ApiWorld, _field: string, _csv: string) {
  // csv is comma-separated: "twin,directional-twin,directional"
  return 'pending'
})

Then('the response body does not contain the field {string}', function(this: ApiWorld, _field: string) {
  return 'pending'
})

Then('the response body is null', function(this: ApiWorld) {
  return 'pending'
})

// ── Cookie assertions ─────────────────────────────────────────────────────────

Then('the response sets an httpOnly cookie named {string}', function(this: ApiWorld, _name: string) {
  return 'pending'
})

Then('the response sets a new httpOnly {string} cookie', function(this: ApiWorld, _name: string) {
  return 'pending'
})

Then('the {string} cookie is cleared', function(this: ApiWorld, _name: string) {
  return 'pending'
})

Then('no auth cookies are set', function(this: ApiWorld) {
  return 'pending'
})

// ── Value capture ─────────────────────────────────────────────────────────────

Then('I capture the {string} from the response as {string}', function(this: ApiWorld, _field: string, _alias: string) {
  return 'pending'
})

// Note: "And I capture..." is also parsed as "Then I capture..." by Cucumber

When('I capture the {string} from the response as {string}', function(this: ApiWorld, _field: string, _alias: string) {
  return 'pending'
})

Then('the captured values {string} and {string} are different', function(this: ApiWorld, _a: string, _b: string) {
  return 'pending'
})

Then('the captured value {string} matches the pattern {string}', function(this: ApiWorld, _alias: string, _pattern: string) {
  return 'pending'
})
```

- [ ] **Step 2: Create `apps/api/test/e2e/step-definitions/health.steps.ts`**

```typescript
// health.steps.ts - Steps specific to the health feature
import { Given } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

Given('PostgreSQL is reachable', function(this: ApiWorld) {
  return 'pending'
})

Given('Redis is reachable', function(this: ApiWorld) {
  return 'pending'
})

Given('PostgreSQL is not reachable', function(this: ApiWorld) {
  return 'pending'
})

Given('Redis is not reachable', function(this: ApiWorld) {
  return 'pending'
})

Given('the ANTHROPIC_API_KEY environment variable is empty', function(this: ApiWorld) {
  return 'pending'
})

Given('the GOOGLE_CLIENT_ID environment variable is set to an invalid value', function(this: ApiWorld) {
  return 'pending'
})
```

- [ ] **Step 3: Run the full suite dry-run**

```bash
cd 91_snowboard_wizard/apps/api
npx cucumber-js --dry-run 2>&1 | tail -20
```

Expected: output includes scenario counts — no `Undefined step` errors for health or common assertion steps.

- [ ] **Step 4: Commit**

```bash
git add apps/api/test/e2e/step-definitions/common.steps.ts \
        apps/api/test/e2e/step-definitions/health.steps.ts
git commit -m "test(e2e): common + health step definition skeletons (all pending)"
```

---

### Task 7: Step definition skeletons — Auth

**Files:**
- Create: `apps/api/test/e2e/step-definitions/auth.steps.ts`

**Interfaces:**
- Consumes: `ApiWorld`
- Produces: all steps referenced in `features/auth/*.feature` that are not in `common.steps.ts`

- [ ] **Step 1: Create `apps/api/test/e2e/step-definitions/auth.steps.ts`**

```typescript
// auth.steps.ts - Step definitions for auth feature files
import { Given, Then } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

// ── Test user setup ───────────────────────────────────────────────────────────

Given('a valid Google ID token exists for {string}', function(this: ApiWorld, _email: string) {
  return 'pending'
})

Given('I am logged in as {string}', async function(this: ApiWorld, _email: string) {
  return 'pending'
})

Given('I am logged in as {string} with name {string}', async function(this: ApiWorld, _email: string, _name: string) {
  return 'pending'
})

Given('a user with Google ID {string} already exists', async function(this: ApiWorld, _googleId: string) {
  return 'pending'
})

Given("that user's name is {string}", async function(this: ApiWorld, _name: string) {
  return 'pending'
})

// ── Cookie / token state ──────────────────────────────────────────────────────

Given('my {string} cookie is valid and not expired', function(this: ApiWorld, _cookieName: string) {
  return 'pending'
})

Given('my {string} cookie is not present', function(this: ApiWorld, _cookieName: string) {
  return 'pending'
})

Given('my {string} cookie value has been corrupted', function(this: ApiWorld, _cookieName: string) {
  return 'pending'
})

Given('my {string} was issued 31 days ago', async function(this: ApiWorld, _cookieName: string) {
  return 'pending'
})

Given('I have a valid refresh token in my cookie jar', function(this: ApiWorld) {
  return 'pending'
})

Given('I have no refresh token cookie', function(this: ApiWorld) {
  return 'pending'
})

Given('my access token expired 1 minute ago', function(this: ApiWorld) {
  return 'pending'
})

// ── Assertions ────────────────────────────────────────────────────────────────

Then('only one user record for {string} exists in the database', async function(this: ApiWorld, _email: string) {
  return 'pending'
})

Then("that user's name is {string}", async function(this: ApiWorld, _name: string) {
  return 'pending'
})

Then('a user record for {string} exists in the database', async function(this: ApiWorld, _email: string) {
  return 'pending'
})

Then('the refresh token can no longer be used to refresh the session', async function(this: ApiWorld) {
  return 'pending'
})

// ── Guest session claim ───────────────────────────────────────────────────────

Given('a guest wizard session exists with id {string}', async function(this: ApiWorld, _sessionId: string) {
  return 'pending'
})

Given('that session belongs to no user', async function(this: ApiWorld) {
  return 'pending'
})

Then('the wizard session {string} is now associated with the logged-in user', async function(this: ApiWorld, _sessionId: string) {
  return 'pending'
})

Then('the wizard session {string} is now associated with user id {string}', async function(this: ApiWorld, _sessionId: string, _userId: string) {
  return 'pending'
})

Then('the wizard session {string} still belongs to user id {string}', async function(this: ApiWorld, _sessionId: string, _userId: string) {
  return 'pending'
})

Then('the wizard session {string} still belongs to no user', async function(this: ApiWorld, _sessionId: string) {
  return 'pending'
})
```

- [ ] **Step 2: Dry-run auth feature files specifically**

```bash
cd 91_snowboard_wizard/apps/api
npx cucumber-js --dry-run test/e2e/features/auth/*.feature test/e2e/features/journeys/session-claim-on-login.feature 2>&1 | grep -E "Undefined|Warning|Error" | head -20
```

Expected: no `Undefined step` lines — every auth step is now registered.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/e2e/step-definitions/auth.steps.ts
git commit -m "test(e2e): auth step definition skeletons (all pending)"
```

---

### Task 8: Step definition skeletons — Scoring + Sessions

**Files:**
- Create: `apps/api/test/e2e/step-definitions/scoring.steps.ts`
- Create: `apps/api/test/e2e/step-definitions/sessions.steps.ts`

**Interfaces:**
- Consumes: `ApiWorld`
- Produces: steps referenced in `scoring.feature` and `sessions.feature` not already in `common.steps.ts`

- [ ] **Step 1: Create `apps/api/test/e2e/step-definitions/scoring.steps.ts`**

```typescript
// scoring.steps.ts - Steps specific to the scoring feature
// Most scoring steps use common When/Then patterns.
// This file holds only scoring-specific Given steps and
// the Scenario Outline parameter variants.
import { Then } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

// The Scenario Outline uses "less than" / "greater than" as plain text
// in the step — those are handled by common.steps.ts's numeric comparison
// steps. No additional steps needed for scoring.feature beyond what
// common.steps.ts provides.

// Placeholder export to prevent "empty module" TypeScript errors.
export {}
```

- [ ] **Step 2: Create `apps/api/test/e2e/step-definitions/sessions.steps.ts`**

```typescript
// sessions.steps.ts - Steps specific to the sessions feature
import { Given } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

Given('I have saved session {string} with answers and phase {int}:', async function(
  this: ApiWorld,
  _sessionId: string,
  _phase: number,
  _answersJson: string,
) {
  return 'pending'
})

Given('I have saved session {string} 7 days and 1 second ago', async function(
  this: ApiWorld,
  _sessionId: string,
) {
  return 'pending'
})
```

- [ ] **Step 3: Dry-run scoring and sessions files**

```bash
cd 91_snowboard_wizard/apps/api
npx cucumber-js --dry-run \
  test/e2e/features/scoring.feature \
  test/e2e/features/sessions.feature 2>&1 | grep -E "Undefined|Warning|Error" | head -20
```

Expected: no `Undefined step` lines.

- [ ] **Step 4: Commit**

```bash
git add apps/api/test/e2e/step-definitions/scoring.steps.ts \
        apps/api/test/e2e/step-definitions/sessions.steps.ts
git commit -m "test(e2e): scoring + sessions step definition skeletons (all pending)"
```

---

### Task 9: Step definition skeletons — Recommendations

**Files:**
- Create: `apps/api/test/e2e/step-definitions/recommendations.steps.ts`

**Interfaces:**
- Consumes: `ApiWorld`
- Produces: steps referenced in `recommendations/*.feature` and journey files that are recommendation-specific

- [ ] **Step 1: Create `apps/api/test/e2e/step-definitions/recommendations.steps.ts`**

```typescript
// recommendations.steps.ts - Steps specific to recommendations features
import { Given, Then } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

// ── Database setup steps ──────────────────────────────────────────────────────

Given('a recommendation exists in the database with id {string} belonging to {string}', async function(
  this: ApiWorld,
  _id: string,
  _ownerEmail: string,
) {
  return 'pending'
})

Given('a recommendation exists in the database with shareToken {string}', async function(
  this: ApiWorld,
  _shareToken: string,
) {
  return 'pending'
})

// ── Assertion steps ───────────────────────────────────────────────────────────

Then('the wizard session for this recommendation is associated with {string}', async function(
  this: ApiWorld,
  _ownerEmail: string,
) {
  return 'pending'
})

Then('the session name is {string}', async function(this: ApiWorld, _name: string) {
  return 'pending'
})
```

- [ ] **Step 2: Full suite dry-run — all feature files**

```bash
cd 91_snowboard_wizard/apps/api
npx cucumber-js --dry-run 2>&1 | grep -E "Undefined|Warning|Error" | head -30
```

Expected: **zero** `Undefined step` lines. Every step in every feature file is registered.

If any `Undefined` lines appear, add matching step definitions to the appropriate file.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/e2e/step-definitions/recommendations.steps.ts
git commit -m "test(e2e): recommendations step definition skeletons (all pending)"
```

---

### Task 10: Verify full suite runs as Pending

**Files:** none created — verification only

**Interfaces:**
- Consumes: all preceding tasks
- Produces: `pnpm --filter @snowboard/api test:e2e` exits 0 with all scenarios marked Pending

- [ ] **Step 1: Run the full Cucumber suite**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test:e2e 2>&1 | tail -20
```

Expected output (exact numbers may vary by Cucumber version):
```
57 scenarios (57 pending)
60 steps (60 pending)    # Scenario Outline rows expand scenario count
0m0.XXXs
```

All scenarios should show as **Pending** — not Undefined, not Failed.

- [ ] **Step 2: Run smoke profile**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test:e2e:smoke 2>&1 | tail -10
```

Expected: only `@smoke`-tagged scenarios, all Pending.

- [ ] **Step 3: Verify Jest unit tests are unaffected**

```bash
cd 91_snowboard_wizard
pnpm --filter @snowboard/api test 2>&1 | tail -5
```

Expected: all existing unit tests still pass (Cucumber has no impact on Jest).

- [ ] **Step 4: Final commit**

```bash
git add -A
git status  # confirm no untracked files missed
git commit -m "test(e2e): Cucumber e2e framework setup complete — 57 scenarios, all Pending

AI_ASSISTED"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| health.feature (5 scenarios) | Task 3 |
| auth/google-login.feature (7 scenarios) | Task 3 |
| auth/token-refresh.feature (5 scenarios) | Task 3 |
| auth/logout.feature (3 scenarios) | Task 3 |
| auth/me.feature (4 scenarios) | Task 3 |
| scoring.feature (9 scenarios incl. outline) | Task 4 |
| sessions.feature (8 scenarios) | Task 4 |
| recommendations/create.feature (7 scenarios) | Task 4 |
| recommendations/retrieve.feature (4 scenarios) | Task 4 |
| recommendations/share.feature (3 scenarios) | Task 4 |
| recommendations/pdf.feature (1 scenario) | Task 4 |
| journeys/guest-wizard-completion.feature (1) | Task 5 |
| journeys/authenticated-wizard-save-reload.feature (1) | Task 5 |
| journeys/session-claim-on-login.feature (2) | Task 5 |
| Cucumber framework setup | Task 1 |
| World + support layer | Task 2 |
| Step skeletons — all steps registered | Tasks 6–9 |
| Full suite runs Pending | Task 10 |

**Placeholder scan:** No TBD, TODO, or "implement later" in any task. Every step body has explicit `return 'pending'`.

**Type consistency:** `ApiWorld` is imported consistently as `import type { ApiWorld } from '../support/world'` in every step file. The `getField`, `resolve`, `storeSetCookie`, `clearCookie`, `csrfOrigin` methods are defined once in `world.ts` and referenced by alias in later tasks — no name drift.

**Known gap:** The `scoring.feature` Scenario Outline step `the response body field "scores.length" is less than 0` uses the text `less than` inline — matched by `common.steps.ts`'s `Then('the response body field {string} is less than {int}', ...)`. Verified match ✓.
