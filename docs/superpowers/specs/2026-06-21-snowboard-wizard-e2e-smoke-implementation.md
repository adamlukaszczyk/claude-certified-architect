# Snowboard Wizard — E2E Smoke Test Implementation

**Date:** 2026-06-21
**Scope:** Implement the `test:e2e:smoke` Cucumber profile so all `@smoke` scenarios pass against a live stack. Auth scenarios are excluded from smoke for now.

## Context

The Cucumber e2e framework is fully scaffolded (`apps/api/test/e2e/`) with 14 feature files, ~59 scenarios, and 6 step-definition files — all returning `'pending'`. This spec covers implementing only the steps exercised by the smoke profile.

**Smoke scenarios to make pass (7 total after auth removal):**

| Feature | Scenario |
|---|---|
| health.feature | All dependencies healthy |
| scoring.feature | Empty answers return all-zero partial scores |
| sessions.feature | Save wizard answers and phase to cache |
| sessions.feature | Retrieve previously saved wizard answers |
| recommendations/create.feature | Guest user creates a recommendation |
| recommendations/share.feature | Anyone can view a recommendation by share token without auth |
| journeys/guest-wizard-completion.feature | Guest completes all wizard phases and receives a shareable recommendation |

## Decisions

- **Auth smoke tests skipped:** Remove `@smoke` from all `@smoke @auth` scenarios in the 4 auth feature files. They keep `@auth` and will be implemented separately when a Google OAuth mock strategy is decided.
- **HTTP client:** `supertest` (already a devDep) against `process.env.API_URL ?? 'http://localhost:3001'` — pure black-box HTTP, no NestJS app bootstrapped in-process.
- **No DB/Redis access from tests:** All test setup happens via API calls.
- **No cleanup:** Tests accumulate data in Redis/Postgres. Session IDs in feature files are fixed strings (idempotent writes); recommendation data is cheap.
- **CSRF:** POST/PUT steps include `Origin: this.csrfOrigin()` (defaults to `http://localhost:3000`). GET steps do not send an Origin header.
- **Implementing only smoke-needed steps:** All other step bodies stay `'pending'` until their respective profiles are enabled.

## Architecture

### Files changed

```
apps/api/test/e2e/
  features/auth/
    google-login.feature       remove @smoke from @smoke @auth scenarios
    token-refresh.feature      same
    me.feature                 same
    logout.feature             same
  step-definitions/
    common.steps.ts            implement smoke HTTP + assertion steps
    health.steps.ts            implement no-op Given preconditions
    sessions.steps.ts          implement Given setup step
    recommendations.steps.ts   implement Given setup step
```

### HTTP call pattern (all smoke HTTP steps)

```typescript
import request from 'supertest'

// Store response for assertions
this.response = {
  status: res.status,
  body: res.body,
  headers: res.headers as Record<string, string | string[]>,
}
```

GET steps: no Origin header.
POST/PUT steps: `.set('Origin', this.csrfOrigin() ?? '')`.

### Alias resolution

Two placeholder mechanisms are needed:

**`<name>` syntax** (journey feature): Gherkin step text literally contains `<my-share-token>`. The regex step captures this as a string; the implementation calls `this.resolve(captured)` before using it in the URL. `ApiWorld.resolve()` already handles this.

**Bare string aliases** (share feature): The Background step creates a recommendation and stores its actual `shareToken` in `this.capturedValues["test-share-token-abc123"]`. The GET step and the `is "test-share-token-abc123"` assertion both need to resolve the bare string:

```typescript
const resolved = this.capturedValues[raw] ?? raw
```

This lookup is used in:
- The `I send GET /api/recommendations/share/:token without auth credentials` step — resolves the captured token before building the URL.
- The `the response body field {string} is {string}` assertion step — resolves the expected value before comparing.

Ordinary string assertions (`"status" is "ok"`) are unaffected: `"ok"` is never a capturedValues key.

## Step-by-step implementation

### 1. Auth feature files — remove `@smoke`

In each of the 4 auth feature files, change `@smoke @auth` → `@auth` on every scenario tag line.

No profile changes needed: the smoke profile is already `@smoke and not @wip`.

### 2. health.steps.ts — no-op preconditions

```typescript
Given('PostgreSQL is reachable', function(this: ApiWorld) {})
Given('Redis is reachable', function(this: ApiWorld) {})
```

`the API is running` and `I have no auth credentials` are already registered in common.steps.ts (also no-ops).

### 3. common.steps.ts — HTTP steps (smoke-only)

Implement these; leave all others `'pending'`:

**Setup:**
- `Given('the API is running', ...)` → no-op (remove `return 'pending'`)
- `Given('I have no auth credentials', ...)` → no-op

**GET steps:**
- `When(/^I send GET \/api\/health$/, ...)` → `request(this.baseUrl).get('/api/health')`
- `When(/^I send GET \/api\/sessions\/(.+)$/, ...)` → `request(this.baseUrl).get('/api/sessions/' + this.resolve(id))`
- `When(/^I send GET \/api\/recommendations\/share\/(.+) without auth credentials$/, ...)` → resolve token via `capturedValues[token] ?? token`, then GET
- `When(/^I send GET \/api\/recommendations\/([^/]+) without auth credentials$/, ...)` → resolve id via `this.resolve(id)`, then GET

**POST steps:**
- `When(/^I send POST \/api\/score with JSON body:$/, ...)` → POST with Origin + parsed docstring body
- `When(/^I send POST \/api\/recommendations with JSON body:$/, ...)` → POST with Origin + parsed docstring body

**PUT steps:**
- `When(/^I send PUT \/api\/sessions\/(.+) with JSON body:$/, ...)` → PUT with Origin + parsed docstring body

### 4. common.steps.ts — assertion steps (smoke-only)

Implement these; leave all others `'pending'`:

- `the response status is {int}` → strict equality on `this.response!.status`
- `the response body field {string} is {string}` → `getField` + alias-resolve expected + strict equality
- `the response body field {string} is the number {int}` → `getField` + strict equality (number)
- `the response body field {string} is a non-empty string` → `getField`, assert string with length > 0
- `the response body field {string} is a non-empty UUID` → `getField`, assert UUID regex `^[0-9a-f-]{36}$`
- `the response body field {string} is a number` → `getField`, assert `typeof === 'number'`
- `the response body field {string} is a number between {int} and {int}` → `getField`, assert `>= min && <= max`
- `the response body field {string} is an object` → `getField`, assert `typeof === 'object' && !Array.isArray && !== null`
- `the response body field {string} matches the pattern {string}` → `getField`, assert `new RegExp(pattern).test(value)`
- `the response body field {string} is one of {string}` → `getField`, split CSV on comma, assert includes
- `Then('I capture the {string} from the response as {string}', ...)` → `this.capturedValues[alias] = String(getField(this.response!.body, field))`

### 5. sessions.steps.ts — setup Given

`Given I have saved session {string} with answers and phase {int}:` → PUT `/api/sessions/:id` with `{ answers: JSON.parse(docstring), phase }`. Assert response status 200 (fast-fail on bad setup).

### 6. recommendations.steps.ts — setup Given

`Given a recommendation exists in the database with shareToken {string}` → POST `/api/recommendations` with `{ answers: { experience: 'intermediate', style: 'all-mountain', weightCategory: 'w_71_85' } }`. Store `response.body.shareToken` in `this.capturedValues[aliasName]`. Assert status 201 (fast-fail on bad setup).

## Error handling in steps

All HTTP steps: throw `Error` if `request(...)` fails at the network level (connection refused). Steps do not assert status — assertions are separate `Then` steps.

Setup Given steps (`sessions.ts`, `recommendations.ts`): assert 200/201 immediately. If the API is down or returns an error, the test fails at setup with a clear message rather than at the assertion step.

## Verification

After implementation:

```bash
# Smoke profile should pass (all 7 scenarios green)
pnpm --filter @snowboard/api test:e2e:smoke

# Full suite should still report Pending (not Failed) for non-smoke scenarios
pnpm --filter @snowboard/api test:e2e
```

Expected smoke output: `7 scenarios (7 passed)`.
Expected full suite output: mix of passed (smoke) + pending (everything else) + 0 failed.
