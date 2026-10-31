# Snowboard Wizard — E2E Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 7 `@smoke` Cucumber scenarios pass against a live stack by implementing only the step definitions they exercise, and fixing one bug in the journey feature file.

**Architecture:** Pure black-box HTTP via supertest against the running API at `API_URL` (default `http://localhost:3001`). All test setup is via API calls — no direct DB or Redis access. Auth scenarios are excluded from smoke (their `@smoke` tag removed). No test data cleanup.

**Tech Stack:** `@cucumber/cucumber@^11`, `supertest@^7`, `node:assert` (built-in), TypeScript 5.6

## Global Constraints

- All file paths are relative to `91_snowboard_wizard/`
- Run commands from `91_snowboard_wizard/` unless a step says otherwise
- Requires a running stack: `podman compose up` before any `test:e2e:smoke` run
- Implement only the steps exercised by the 7 smoke scenarios; all others keep `return 'pending'`
- No new files — all changes are modifications to existing files
- POST and PUT steps must include `Origin: this.csrfOrigin()` (CSRF guard)
- GET steps do NOT send an Origin header
- `setDefaultTimeout(60_000)` must be set before smoke runs (Claude API calls can take 30+ s)

## File Map

**Modified files only (no new files):**

```
apps/api/test/e2e/
  features/
    journeys/guest-wizard-completion.feature   fix: wrap scoring bodies in { "answers": {...} }
    auth/google-login.feature                  remove @smoke from @smoke @auth scenario
    auth/token-refresh.feature                 same
    auth/me.feature                            same
    auth/logout.feature                        same
  support/
    hooks.ts                                   add setDefaultTimeout(60_000)
  step-definitions/
    common.steps.ts                            implement smoke HTTP + assertion steps
    health.steps.ts                            implement no-op PostgreSQL/Redis preconditions
    sessions.steps.ts                          implement Given setup step
    recommendations.steps.ts                   implement Given setup step
```

---

### Task 1: Feature file fixes

Fix a bug in the journey feature (scoring request bodies missing `answers` wrapper) and remove `@smoke` from auth scenarios so they are excluded from the smoke profile without any profile config change.

**Files:**
- Modify: `apps/api/test/e2e/features/journeys/guest-wizard-completion.feature`
- Modify: `apps/api/test/e2e/features/auth/google-login.feature`
- Modify: `apps/api/test/e2e/features/auth/token-refresh.feature`
- Modify: `apps/api/test/e2e/features/auth/me.feature`
- Modify: `apps/api/test/e2e/features/auth/logout.feature`

**Interfaces:**
- Produces: smoke profile contains exactly 7 non-auth scenarios

**Bug context:** The scoring endpoint (`POST /api/score`) uses a DTO with a required `answers` field: `class ScoreRequestDto { @IsObject() answers!: Answers }`. All bodies must be `{ "answers": { ... } }`. The journey feature currently sends the answers as top-level keys, which NestJS rejects with 400.

- [ ] **Step 1: Fix guest-wizard-completion.feature — wrap all three scoring bodies**

Replace the three `When I send POST /api/score with JSON body:` docstrings in `apps/api/test/e2e/features/journeys/guest-wizard-completion.feature`:

**Phase 1 block** — change from:
```gherkin
    When I send POST /api/score with JSON body:
      """
      { "experience": "intermediate", "weightCategory": "w_71_85", "stance": "regular" }
      """
```
to:
```gherkin
    When I send POST /api/score with JSON body:
      """
      { "answers": { "experience": "intermediate", "weightCategory": "w_71_85", "stance": "regular" } }
      """
```

**Phase 2 block** — change from:
```gherkin
    When I send POST /api/score with JSON body:
      """
      {
        "experience": "intermediate",
        "weightCategory": "w_71_85",
        "style": "all-mountain",
        "terrainMix": "mixed"
      }
      """
```
to:
```gherkin
    When I send POST /api/score with JSON body:
      """
      { "answers": { "experience": "intermediate", "weightCategory": "w_71_85", "style": "all-mountain", "terrainMix": "mixed" } }
      """
```

**Phase 3 block** — change from:
```gherkin
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
```
to:
```gherkin
    When I send POST /api/score with JSON body:
      """
      { "answers": { "experience": "intermediate", "weightCategory": "w_71_85", "style": "all-mountain", "terrainMix": "mixed", "speedPreference": "moderate" } }
      """
```

- [ ] **Step 2: Remove @smoke from auth/google-login.feature**

In `apps/api/test/e2e/features/auth/google-login.feature`, line 10, change:
```gherkin
  @smoke @auth
```
to:
```gherkin
  @auth
```

- [ ] **Step 3: Remove @smoke from auth/token-refresh.feature**

In `apps/api/test/e2e/features/auth/token-refresh.feature`, line 10, change:
```gherkin
  @smoke @auth
```
to:
```gherkin
  @auth
```

- [ ] **Step 4: Remove @smoke from auth/me.feature**

In `apps/api/test/e2e/features/auth/me.feature`, line 9, change:
```gherkin
  @smoke @auth
```
to:
```gherkin
  @auth
```

- [ ] **Step 5: Remove @smoke from auth/logout.feature**

In `apps/api/test/e2e/features/auth/logout.feature`, line 10, change:
```gherkin
  @smoke @auth
```
to:
```gherkin
  @auth
```

- [ ] **Step 6: Verify smoke dry-run excludes auth and includes exactly 7 scenarios**

```bash
pnpm --filter @snowboard/api test:e2e:smoke -- --dry-run 2>&1 | tail -5
```

Expected output includes: `7 scenarios` and no auth scenario titles (no "First-time login", "Valid refresh token", "Authenticated user retrieves", "Logout clears").

- [ ] **Step 7: Commit**

```bash
git add apps/api/test/e2e/features/
git commit -m "fix(e2e): wrap journey scoring bodies in answers key; remove @smoke from auth scenarios

AI_ASSISTED"
```

---

### Task 2: Timeout + no-op Given steps

Add the global step timeout (needed for Claude API calls inside recommendations) and implement the three no-op Given preconditions that appear in Background blocks of smoke scenarios.

**Files:**
- Modify: `apps/api/test/e2e/support/hooks.ts`
- Modify: `apps/api/test/e2e/step-definitions/common.steps.ts` (2 steps)
- Modify: `apps/api/test/e2e/step-definitions/health.steps.ts` (2 steps)

**Interfaces:**
- Produces: smoke scenarios no longer timeout at 5 s; Background steps in health + scoring + sessions + rec create + journey no longer return Pending

- [ ] **Step 1: Add setDefaultTimeout to hooks.ts**

Replace the entire contents of `apps/api/test/e2e/support/hooks.ts` with:

```typescript
// hooks.ts - Cucumber Before/After lifecycle hooks
import { Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import type { ApiWorld } from './world'

setDefaultTimeout(60_000)

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

- [ ] **Step 2: Implement no-op Given steps in common.steps.ts**

In `apps/api/test/e2e/step-definitions/common.steps.ts`, replace:

```typescript
Given('the API is running', async function(this: ApiWorld) {
  return 'pending'
})

Given('I have no auth credentials', function(this: ApiWorld) {
  return 'pending'
})
```

with:

```typescript
Given('the API is running', function(this: ApiWorld) {
  // no-op: assumes a live stack is running at this.baseUrl
})

Given('I have no auth credentials', function(this: ApiWorld) {
  // no-op: cookie jar is empty by default (reset in Before hook)
})
```

- [ ] **Step 3: Implement no-op Given steps in health.steps.ts**

Replace the entire contents of `apps/api/test/e2e/step-definitions/health.steps.ts` with:

```typescript
// health.steps.ts - Steps specific to the health feature
import { Given } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

Given('PostgreSQL is reachable', function(this: ApiWorld) {
  // no-op: assumes live stack is healthy
})

Given('Redis is reachable', function(this: ApiWorld) {
  // no-op: assumes live stack is healthy
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

- [ ] **Step 4: Dry-run smoke profile to confirm no Undefined step errors**

```bash
pnpm --filter @snowboard/api test:e2e:smoke -- --dry-run 2>&1 | grep -i "undefined" | head -10
```

Expected: no output (zero Undefined steps).

- [ ] **Step 5: Commit**

```bash
git add apps/api/test/e2e/support/hooks.ts \
        apps/api/test/e2e/step-definitions/common.steps.ts \
        apps/api/test/e2e/step-definitions/health.steps.ts
git commit -m "test(e2e): set 60s timeout; implement no-op Given preconditions

AI_ASSISTED"
```

---

### Task 3: HTTP call steps (common.steps.ts)

Implement the seven When steps exercised by smoke scenarios. All other When steps remain `return 'pending'`.

**Files:**
- Modify: `apps/api/test/e2e/step-definitions/common.steps.ts`

**Interfaces:**
- Consumes: `ApiWorld.baseUrl`, `ApiWorld.csrfOrigin()`, `ApiWorld.resolve()`, `ApiWorld.capturedValues`, `ApiWorld.response`
- Produces: `this.response = { status: number, body: unknown, headers: Record<string, string | string[]> }` after every HTTP step

- [ ] **Step 1: Add supertest import to common.steps.ts**

At the top of `apps/api/test/e2e/step-definitions/common.steps.ts`, add `request` import. The file currently starts with:

```typescript
// common.steps.ts - Shared step definitions: HTTP calls, assertions, cookie helpers
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'
```

Change it to:

```typescript
// common.steps.ts - Shared step definitions: HTTP calls, assertions, cookie helpers
import request from 'supertest'
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'
```

- [ ] **Step 2: Implement GET /api/health**

Replace:
```typescript
When(/^I send GET \/api\/health$/, async function(this: ApiWorld) {
  return 'pending'
})
```
with:
```typescript
When(/^I send GET \/api\/health$/, async function(this: ApiWorld) {
  const res = await request(this.baseUrl).get('/api/health')
  this.response = { status: res.status, body: res.body, headers: res.headers as Record<string, string | string[]> }
})
```

- [ ] **Step 3: Implement GET /api/sessions/:id**

Replace:
```typescript
When(/^I send GET \/api\/sessions\/(.+)$/, async function(this: ApiWorld, _id: string) {
  return 'pending'
})
```
with:
```typescript
When(/^I send GET \/api\/sessions\/(.+)$/, async function(this: ApiWorld, id: string) {
  const resolvedId = this.resolve(id)
  const res = await request(this.baseUrl).get(`/api/sessions/${resolvedId}`)
  this.response = { status: res.status, body: res.body, headers: res.headers as Record<string, string | string[]> }
})
```

- [ ] **Step 4: Implement GET /api/recommendations/share/:token without auth**

Replace:
```typescript
When(/^I send GET \/api\/recommendations\/share\/(.+) without auth credentials$/, async function(this: ApiWorld, _token: string) {
  return 'pending'
})
```
with:
```typescript
When(/^I send GET \/api\/recommendations\/share\/(.+) without auth credentials$/, async function(this: ApiWorld, token: string) {
  // capturedValues lookup handles bare-string aliases (share.feature Background)
  // this.resolve() handles <placeholder> syntax (journey feature)
  const resolvedToken = this.capturedValues[token] ?? this.resolve(token)
  const res = await request(this.baseUrl).get(`/api/recommendations/share/${resolvedToken}`)
  this.response = { status: res.status, body: res.body, headers: res.headers as Record<string, string | string[]> }
})
```

- [ ] **Step 5: Implement GET /api/recommendations/:id without auth**

Replace:
```typescript
When(/^I send GET \/api\/recommendations\/([^/]+) without auth credentials$/, async function(this: ApiWorld, _id: string) {
  return 'pending'
})
```
with:
```typescript
When(/^I send GET \/api\/recommendations\/([^/]+) without auth credentials$/, async function(this: ApiWorld, id: string) {
  const resolvedId = this.resolve(id)
  const res = await request(this.baseUrl).get(`/api/recommendations/${resolvedId}`)
  this.response = { status: res.status, body: res.body, headers: res.headers as Record<string, string | string[]> }
})
```

- [ ] **Step 6: Implement POST /api/score**

Replace:
```typescript
When(/^I send POST \/api\/score with JSON body:$/, async function(this: ApiWorld, _body: string) {
  return 'pending'
})
```
with:
```typescript
When(/^I send POST \/api\/score with JSON body:$/, async function(this: ApiWorld, body: string) {
  const res = await request(this.baseUrl)
    .post('/api/score')
    .set('Origin', this.csrfOrigin()!)
    .set('Content-Type', 'application/json')
    .send(JSON.parse(body))
  this.response = { status: res.status, body: res.body, headers: res.headers as Record<string, string | string[]> }
})
```

- [ ] **Step 7: Implement POST /api/recommendations**

Replace:
```typescript
When(/^I send POST \/api\/recommendations with JSON body:$/, async function(this: ApiWorld, _body: string) {
  return 'pending'
})
```
with:
```typescript
When(/^I send POST \/api\/recommendations with JSON body:$/, async function(this: ApiWorld, body: string) {
  const res = await request(this.baseUrl)
    .post('/api/recommendations')
    .set('Origin', this.csrfOrigin()!)
    .set('Content-Type', 'application/json')
    .send(JSON.parse(body))
  this.response = { status: res.status, body: res.body, headers: res.headers as Record<string, string | string[]> }
})
```

- [ ] **Step 8: Implement PUT /api/sessions/:id**

Replace:
```typescript
When(/^I send PUT \/api\/sessions\/(.+) with JSON body:$/, async function(this: ApiWorld, _id: string, _body: string) {
  return 'pending'
})
```
with:
```typescript
When(/^I send PUT \/api\/sessions\/(.+) with JSON body:$/, async function(this: ApiWorld, id: string, body: string) {
  const resolvedId = this.resolve(id)
  const res = await request(this.baseUrl)
    .put(`/api/sessions/${resolvedId}`)
    .set('Origin', this.csrfOrigin()!)
    .set('Content-Type', 'application/json')
    .send(JSON.parse(body))
  this.response = { status: res.status, body: res.body, headers: res.headers as Record<string, string | string[]> }
})
```

- [ ] **Step 9: TypeScript check**

```bash
pnpm --filter @snowboard/api typecheck 2>&1 | grep -E "error TS" | head -10
```

Expected: no output (zero TypeScript errors).

- [ ] **Step 10: Commit**

```bash
git add apps/api/test/e2e/step-definitions/common.steps.ts
git commit -m "test(e2e): implement smoke HTTP call steps

AI_ASSISTED"
```

---

### Task 4: Assertion steps (common.steps.ts)

Implement all Then steps exercised by smoke scenarios. After this task, 5 of the 7 smoke scenarios will pass (health, scoring, sessions/save, rec-create, journey). Sessions/retrieve and rec-share need their Given setup steps (Tasks 5–6).

**Files:**
- Modify: `apps/api/test/e2e/step-definitions/common.steps.ts`

**Interfaces:**
- Consumes: `ApiWorld.response.status`, `ApiWorld.response.body`, `ApiWorld.getField()`, `ApiWorld.capturedValues`, `ApiWorld.resolve()`
- Produces: passing assertions or thrown `AssertionError` with descriptive message

- [ ] **Step 1: Add assert import to common.steps.ts**

Add `import assert from 'node:assert'` after the `import request from 'supertest'` line:

```typescript
// common.steps.ts - Shared step definitions: HTTP calls, assertions, cookie helpers
import request from 'supertest'
import assert from 'node:assert'
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'
```

- [ ] **Step 2: Implement `the response status is {int}`**

Replace:
```typescript
Then('the response status is {int}', function(this: ApiWorld, _expectedStatus: number) {
  return 'pending'
})
```
with:
```typescript
Then('the response status is {int}', function(this: ApiWorld, expectedStatus: number) {
  assert.strictEqual(
    this.response!.status,
    expectedStatus,
    `expected status ${expectedStatus} but got ${this.response!.status}: ${JSON.stringify(this.response!.body)}`,
  )
})
```

- [ ] **Step 3: Implement `the response body field {string} is {string}`**

This step resolves `rawExpected` through `capturedValues` first to support the share.feature alias pattern (`"shareToken" is "test-share-token-abc123"` where `capturedValues["test-share-token-abc123"]` holds the real token).

Replace:
```typescript
Then('the response body field {string} is {string}', function(this: ApiWorld, _field: string, _value: string) {
  return 'pending'
})
```
with:
```typescript
Then('the response body field {string} is {string}', function(this: ApiWorld, field: string, rawExpected: string) {
  const actual = this.getField(this.response!.body, field)
  const expected = this.capturedValues[rawExpected] ?? rawExpected
  assert.strictEqual(
    String(actual),
    expected,
    `expected field "${field}" to equal "${expected}" but got "${actual}"`,
  )
})
```

- [ ] **Step 4: Implement `the response body field {string} is the number {int}`**

Replace:
```typescript
Then('the response body field {string} is the number {int}', function(this: ApiWorld, _field: string, _value: number) {
  return 'pending'
})
```
with:
```typescript
Then('the response body field {string} is the number {int}', function(this: ApiWorld, field: string, expected: number) {
  const actual = this.getField(this.response!.body, field)
  assert.strictEqual(actual, expected, `expected field "${field}" to be ${expected} but got ${actual}`)
})
```

- [ ] **Step 5: Implement `the response body field {string} is a number`**

Replace:
```typescript
Then('the response body field {string} is a number', function(this: ApiWorld, _field: string) {
  return 'pending'
})
```
with:
```typescript
Then('the response body field {string} is a number', function(this: ApiWorld, field: string) {
  const actual = this.getField(this.response!.body, field)
  assert.ok(
    typeof actual === 'number',
    `expected field "${field}" to be a number but got ${typeof actual} (${actual})`,
  )
})
```

- [ ] **Step 6: Implement `the response body field {string} is a non-empty string`**

Replace:
```typescript
Then('the response body field {string} is a non-empty string', function(this: ApiWorld, _field: string) {
  return 'pending'
})
```
with:
```typescript
Then('the response body field {string} is a non-empty string', function(this: ApiWorld, field: string) {
  const actual = this.getField(this.response!.body, field)
  assert.ok(
    typeof actual === 'string' && actual.length > 0,
    `expected field "${field}" to be a non-empty string but got ${JSON.stringify(actual)}`,
  )
})
```

- [ ] **Step 7: Implement `the response body field {string} is a non-empty UUID`**

Replace:
```typescript
Then('the response body field {string} is a non-empty UUID', function(this: ApiWorld, _field: string) {
  return 'pending'
})
```
with:
```typescript
Then('the response body field {string} is a non-empty UUID', function(this: ApiWorld, field: string) {
  const actual = this.getField(this.response!.body, field)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  assert.ok(
    typeof actual === 'string' && uuidRegex.test(actual),
    `expected field "${field}" to be a UUID but got ${JSON.stringify(actual)}`,
  )
})
```

- [ ] **Step 8: Implement `the response body field {string} is a number between {int} and {int}`**

Replace:
```typescript
Then('the response body field {string} is a number between {int} and {int}', function(this: ApiWorld, _field: string, _min: number, _max: number) {
  return 'pending'
})
```
with:
```typescript
Then('the response body field {string} is a number between {int} and {int}', function(this: ApiWorld, field: string, min: number, max: number) {
  const actual = this.getField(this.response!.body, field)
  assert.ok(
    typeof actual === 'number' && actual >= min && actual <= max,
    `expected field "${field}" to be a number between ${min} and ${max} but got ${actual}`,
  )
})
```

- [ ] **Step 9: Implement `the response body field {string} is an object`**

Replace:
```typescript
Then('the response body field {string} is an object', function(this: ApiWorld, _field: string) {
  return 'pending'
})
```
with:
```typescript
Then('the response body field {string} is an object', function(this: ApiWorld, field: string) {
  const actual = this.getField(this.response!.body, field)
  assert.ok(
    actual !== null && typeof actual === 'object' && !Array.isArray(actual),
    `expected field "${field}" to be a plain object but got ${JSON.stringify(actual)}`,
  )
})
```

- [ ] **Step 10: Implement `the response body field {string} matches the pattern {string}`**

Replace:
```typescript
Then('the response body field {string} matches the pattern {string}', function(this: ApiWorld, _field: string, _pattern: string) {
  return 'pending'
})
```
with:
```typescript
Then('the response body field {string} matches the pattern {string}', function(this: ApiWorld, field: string, pattern: string) {
  const actual = this.getField(this.response!.body, field)
  const regex = new RegExp(pattern)
  assert.ok(
    regex.test(String(actual)),
    `expected field "${field}" (${actual}) to match pattern /${pattern}/`,
  )
})
```

- [ ] **Step 11: Implement `the response body field {string} is one of {string}`**

Replace:
```typescript
Then('the response body field {string} is one of {string}', function(this: ApiWorld, _field: string, _csv: string) {
  // csv is comma-separated: "twin,directional-twin,directional"
  return 'pending'
})
```
with:
```typescript
Then('the response body field {string} is one of {string}', function(this: ApiWorld, field: string, csv: string) {
  const actual = this.getField(this.response!.body, field)
  const options = csv.split(',')
  assert.ok(
    options.includes(String(actual)),
    `expected field "${field}" to be one of [${csv}] but got "${actual}"`,
  )
})
```

- [ ] **Step 12: Implement `I capture the {string} from the response as {string}`**

Replace:
```typescript
Then('I capture the {string} from the response as {string}', function(this: ApiWorld, _field: string, _alias: string) {
  return 'pending'
})
```
with:
```typescript
Then('I capture the {string} from the response as {string}', function(this: ApiWorld, field: string, alias: string) {
  const value = this.getField(this.response!.body, field)
  assert.ok(
    value !== undefined && value !== null,
    `cannot capture "${field}" — field is absent from response body`,
  )
  this.capturedValues[alias] = String(value)
})
```

- [ ] **Step 13: TypeScript check**

```bash
pnpm --filter @snowboard/api typecheck 2>&1 | grep -E "error TS" | head -10
```

Expected: no output.

- [ ] **Step 14: Run smoke suite against live stack — expect 5 of 7 scenarios to pass**

Requires running stack (`podman compose up` if not already running).

```bash
pnpm --filter @snowboard/api test:e2e:smoke 2>&1 | tail -15
```

Expected: `5 scenarios (5 passed, 2 pending)` — the 2 pending are sessions/retrieve (needs Task 5) and rec-share (needs Task 6).

If any scenario fails (not pending): check the error message. Common issues:
- `AssertionError: expected status 200 but got 400` on scoring → verify request body has `"answers"` wrapper (fixed in Task 1)
- `Error: connect ECONNREFUSED` → stack is not running

- [ ] **Step 15: Commit**

```bash
git add apps/api/test/e2e/step-definitions/common.steps.ts
git commit -m "test(e2e): implement smoke assertion and capture steps

AI_ASSISTED"
```

---

### Task 5: sessions.steps.ts — Given setup

Implement the `Given I have saved session...` step so the sessions/retrieve smoke scenario can set up its precondition via the API.

**Files:**
- Modify: `apps/api/test/e2e/step-definitions/sessions.steps.ts`

**Interfaces:**
- Consumes: `ApiWorld.baseUrl`, `ApiWorld.csrfOrigin()`
- The step sends `{ answers: JSON.parse(answersJson), phase }` to `PUT /api/sessions/:id`. The `answersJson` docstring is the answers object only (e.g. `{ "style": "powder" }`), not the full body.

- [ ] **Step 1: Implement the Given setup step in sessions.steps.ts**

Replace the entire contents of `apps/api/test/e2e/step-definitions/sessions.steps.ts` with:

```typescript
// sessions.steps.ts - Steps specific to the sessions feature
import request from 'supertest'
import assert from 'node:assert'
import { Given } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

Given('I have saved session {string} with answers and phase {int}:', async function(
  this: ApiWorld,
  sessionId: string,
  phase: number,
  answersJson: string,
) {
  const res = await request(this.baseUrl)
    .put(`/api/sessions/${sessionId}`)
    .set('Origin', this.csrfOrigin()!)
    .set('Content-Type', 'application/json')
    .send({ answers: JSON.parse(answersJson), phase })
  assert.strictEqual(res.status, 200, `setup: failed to save session "${sessionId}": ${JSON.stringify(res.body)}`)
})

Given('I have saved session {string} 7 days and 1 second ago', async function(
  this: ApiWorld,
  _sessionId: string,
) {
  return 'pending'
})
```

- [ ] **Step 2: Run smoke suite — expect 6 of 7 scenarios to pass**

```bash
pnpm --filter @snowboard/api test:e2e:smoke 2>&1 | tail -10
```

Expected: `6 scenarios (6 passed, 1 pending)` — the 1 pending is rec-share (needs Task 6).

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/e2e/step-definitions/sessions.steps.ts
git commit -m "test(e2e): implement sessions Given setup step

AI_ASSISTED"
```

---

### Task 6: recommendations.steps.ts — Given setup

Implement the `Given a recommendation exists in the database with shareToken...` step by creating a real recommendation via the API and storing its actual `shareToken` under the alias key. This makes the bare-string alias resolution in Task 4 Step 3 work.

**Files:**
- Modify: `apps/api/test/e2e/step-definitions/recommendations.steps.ts`

**Interfaces:**
- Consumes: `ApiWorld.baseUrl`, `ApiWorld.csrfOrigin()`, `ApiWorld.capturedValues`
- The step argument `tokenAlias` is `"test-share-token-abc123"` (as written in the Gherkin). The step stores `response.body.shareToken` (the real UUID-based token) under `capturedValues["test-share-token-abc123"]`. Later steps resolve `"test-share-token-abc123"` to the real token via `capturedValues[raw] ?? raw`.

- [ ] **Step 1: Implement the Given setup step in recommendations.steps.ts**

Replace the entire contents of `apps/api/test/e2e/step-definitions/recommendations.steps.ts` with:

```typescript
// recommendations.steps.ts - Steps specific to recommendations features
import request from 'supertest'
import assert from 'node:assert'
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
  tokenAlias: string,
) {
  const res = await request(this.baseUrl)
    .post('/api/recommendations')
    .set('Origin', this.csrfOrigin()!)
    .set('Content-Type', 'application/json')
    .send({ answers: { experience: 'intermediate', style: 'all-mountain', weightCategory: 'w_71_85' } })
  assert.strictEqual(res.status, 201, `setup: failed to create recommendation: ${JSON.stringify(res.body)}`)
  this.capturedValues[tokenAlias] = res.body.shareToken
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

- [ ] **Step 2: Run smoke suite — expect all 7 scenarios to pass**

```bash
pnpm --filter @snowboard/api test:e2e:smoke 2>&1 | tail -10
```

Expected: `7 scenarios (7 passed)` with 0 pending and 0 failed.

If `rec-share` fails with `AssertionError: expected field "shareToken" to equal "test-share-token-abc123"`:
- This means the alias resolution isn't working. Check that `capturedValues["test-share-token-abc123"]` is set by the Given step (Step 1 above) and that the assertion step in common.steps.ts reads `const expected = this.capturedValues[rawExpected] ?? rawExpected` (Task 4 Step 3).

- [ ] **Step 3: Run full suite to verify non-smoke scenarios are still Pending (not Failed)**

```bash
pnpm --filter @snowboard/api test:e2e 2>&1 | tail -10
```

Expected: smoke scenarios passed + remaining scenarios pending, `0 failed`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/test/e2e/step-definitions/recommendations.steps.ts
git commit -m "test(e2e): implement recommendations Given setup step — all 7 smoke scenarios pass

AI_ASSISTED"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Remove @smoke from auth feature files | Task 1 |
| Fix journey feature scoring request bodies | Task 1 |
| setDefaultTimeout(60_000) | Task 2 |
| health.steps.ts no-op preconditions | Task 2 |
| common.steps.ts no-op Given steps | Task 2 |
| All smoke HTTP call steps | Task 3 |
| All smoke assertion steps | Task 4 |
| Capture step | Task 4 |
| sessions.steps.ts Given setup | Task 5 |
| recommendations.steps.ts Given setup | Task 6 |
| 7 smoke scenarios pass | Task 6 Step 2 |
| Non-smoke scenarios remain Pending | Task 6 Step 3 |

**Alias resolution consistency:**
- `capturedValues[token] ?? this.resolve(token)` in GET share step (Task 3 Step 4)
- `capturedValues[rawExpected] ?? rawExpected` in field-is-string assertion (Task 4 Step 3)
- Both use the same key (`"test-share-token-abc123"`) written by the recommendations Given step (Task 6 Step 1)

**No placeholders:** All steps contain complete code. ✅

**Type consistency:** `this.response` is typed as `StoredResponse | null` in ApiWorld. All assertion steps use `this.response!.status` and `this.response!.body` (non-null asserted after the corresponding When step has run). `getField` returns `unknown` — assertions call `typeof` or cast via `String()` where needed. ✅
