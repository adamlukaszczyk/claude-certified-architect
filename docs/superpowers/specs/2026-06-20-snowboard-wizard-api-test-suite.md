# Snowboard Wizard — API E2E Test Suite (BDD)

**Date:** 2026-06-20
**Scope:** NestJS API at `apps/api/` — all endpoints + three cross-cutting user journeys
**Format:** Gherkin (Feature / Scenario / Given / When / Then)
**Target:** Running API via Docker Compose (`http://localhost:3001`)

---

## Organization Recommendation

### Structure

```
apps/api/test/e2e/
├── features/
│   ├── health.feature
│   ├── auth/
│   │   ├── google-login.feature
│   │   ├── token-refresh.feature
│   │   ├── logout.feature
│   │   └── me.feature
│   ├── scoring.feature
│   ├── sessions.feature
│   ├── recommendations/
│   │   ├── create.feature
│   │   ├── retrieve.feature
│   │   ├── share.feature
│   │   └── pdf.feature
│   └── journeys/
│       ├── guest-wizard-completion.feature
│       ├── authenticated-wizard-save-reload.feature
│       └── session-claim-on-login.feature
├── step-definitions/
│   ├── auth.steps.ts
│   ├── scoring.steps.ts
│   ├── sessions.steps.ts
│   ├── recommendations.steps.ts
│   ├── health.steps.ts
│   └── common.steps.ts          # shared: cookies, headers, response capture
└── support/
    ├── world.ts                  # shared state: cookies, last response, test user
    ├── hooks.ts                  # Before: reset DB/Redis; After: cleanup
    └── fixtures.ts               # valid answer sets per rider archetype
```

### Framework Recommendation

**Cucumber.js** (`@cucumber/cucumber`) + **Supertest** (HTTP) + **`@testcontainers/postgresql`** + **`@testcontainers/redis`** (ephemeral infra per run).

Alternatives:
- `jest-cucumber` if you prefer to stay fully in Jest (less idiomatic Gherkin, no native `Background`/`Rule` support)
- `pactum` + `@cucumber/cucumber` if you want a more fluent HTTP DSL at the cost of another dependency

Cucumber.js is recommended because it gives you true `.feature` files that non-engineers can read, a `World` object for shared state across steps, and native `Background` / `Rule` / `Scenario Outline` syntax that matches the patterns below.

### Tagging Strategy

| Tag | Meaning |
|---|---|
| `@smoke` | Minimal happy-path subset — runs in CI on every push |
| `@regression` | Full suite — runs on PR + nightly |
| `@auth` | Auth-related scenarios |
| `@security` | CSRF, token security, session fixation |
| `@journey` | Cross-cutting user flows |
| `@wip` | Scenarios under active development — excluded from CI |

---

## Feature Files

---

### `features/health.feature`

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
    And the response body matches:
      | field                        | value |
      | status                       | ok    |
      | checks.postgresql.status     | ok    |
      | checks.redis.status          | ok    |
      | checks.anthropic.status      | ok    |
      | checks.google.status         | ok    |

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

---

### `features/auth/google-login.feature`

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
    When I send POST /api/auth/google with:
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
    When I send POST /api/auth/google with:
      | idToken | <valid-google-id-token-for-alice-with-name-Alice-New> |
    Then the response status is 200
    And only one user record for "alice@example.com" exists in the database
    And that user's name is "Alice New"

  @auth
  Scenario: Login with an invalid Google ID token is rejected
    When I send POST /api/auth/google with:
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
    When I send POST /api/auth/google with:
      | idToken | <valid-google-id-token> |
    And the request has no Origin or Referer header
    Then the response status is 403

  @auth
  Scenario: Login with a guest session ID claims the guest session
    Given a guest wizard session exists with id "guest-session-uuid"
    When I send POST /api/auth/google with:
      | idToken        | <valid-google-id-token> |
      | guestSessionId | guest-session-uuid      |
    Then the response status is 200
    And the wizard session "guest-session-uuid" is now associated with the logged-in user

  @auth
  Scenario: Login with an unrecognised guest session ID succeeds without error
    When I send POST /api/auth/google with:
      | idToken        | <valid-google-id-token>    |
      | guestSessionId | non-existent-session-id    |
    Then the response status is 200
    And the response body field "userId" is a non-empty UUID
```

---

### `features/auth/token-refresh.feature`

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
    And the response body field "ok" is true

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
    Given my "refresh_token" cookie is valid
    When I send POST /api/auth/refresh with no Origin or Referer header
    Then the response status is 403
```

---

### `features/auth/logout.feature`

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
    Given I have a valid refresh token in a cookie
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
    And the response body field "ok" is true

  @security
  Scenario: Logout without Origin header is rejected (CSRF)
    When I send POST /api/auth/logout with no Origin or Referer header
    Then the response status is 403
```

---

### `features/auth/me.feature`

```gherkin
Feature: Current user profile
  As an authenticated user
  I want to retrieve my profile
  So that the frontend can display my account details

  Background:
    Given the API is running

  @smoke @auth
  Scenario: Authenticated user retrieves their profile
    Given I am logged in as "alice@example.com" with name "Alice" and no avatar
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
    When I send GET /api/auth/me
    Then the response status is 401
```

---

### `features/scoring.feature`

```gherkin
Feature: Incremental wizard scoring
  As a wizard user
  I want my answers to be scored in real time
  So that the live profile sidebar updates after each selection

  Background:
    Given the API is running

  @smoke
  Scenario: Empty answers return all-zero partial scores
    When I send POST /api/score with answers:
      """json
      {}
      """
    Then the response status is 200
    And the response body field "scores.flex" is 0
    And the response body field "scores.length" is 0
    And the response body field "scores.camber" is 0

  Scenario: Powder riding style produces positive taper, float and shape scores
    When I send POST /api/score with answers:
      """json
      { "style": "powder" }
      """
    Then the response status is 200
    And the response body field "scores.taper" is greater than 0
    And the response body field "scores.float" is greater than 0
    And the response body field "scores.shape" is greater than 0

  Scenario: Freestyle riding style produces a negative flex score
    When I send POST /api/score with answers:
      """json
      { "style": "freestyle" }
      """
    Then the response status is 200
    And the response body field "scores.flex" is less than 0

  Scenario: Carving riding style produces a positive camber score
    When I send POST /api/score with answers:
      """json
      { "style": "carving" }
      """
    Then the response status is 200
    And the response body field "scores.camber" is greater than 0

  Scenario: Beginner experience reduces flex score relative to no experience answer
    When I send POST /api/score with answers:
      """json
      { "experience": "beginner" }
      """
    Then the response status is 200
    And the response body field "scores.flex" is less than 0

  Scenario Outline: Weight category influences length and flex scores
    When I send POST /api/score with answers:
      """json
      { "weightCategory": "<weight>" }
      """
    Then the response body field "scores.length" is <length_direction> 0
    And the response body field "scores.flex" is <flex_direction> 0

    Examples:
      | weight      | length_direction | flex_direction |
      | under_55    | less than        | less than      |
      | over_100    | greater than     | greater than   |

  @security
  Scenario: POST /score without Origin header is rejected (CSRF)
    When I send POST /api/score with answers {} and no Origin or Referer header
    Then the response status is 403

  Scenario: POST /score with a non-object answers field returns 400
    When I send POST /api/score with body:
      """json
      { "answers": "not-an-object" }
      """
    Then the response status is 400

  Scenario: POST /score with a missing answers field returns 400
    When I send POST /api/score with an empty body
    Then the response status is 400
```

---

### `features/sessions.feature`

```gherkin
Feature: In-progress wizard session cache
  As a wizard user
  I want my partial answers cached between page loads
  So that I can resume a session without losing progress

  Background:
    Given the API is running

  @smoke
  Scenario: Save wizard answers and phase to cache
    When I send PUT /api/sessions/my-session-id with body:
      """json
      {
        "answers": { "style": "powder", "experience": "intermediate" },
        "phase": 2
      }
      """
    Then the response status is 200

  @smoke
  Scenario: Retrieve previously saved wizard answers
    Given I have saved session "my-session-id" with answers { "style": "powder" } at phase 2
    When I send GET /api/sessions/my-session-id
    Then the response status is 200
    And the response body field "answers.style" is "powder"
    And the response body field "phase" is 2

  Scenario: Retrieving a non-existent session returns null
    When I send GET /api/sessions/does-not-exist
    Then the response status is 200
    And the response body is null

  Scenario: Overwriting a session replaces the previous answers
    Given I have saved session "my-session-id" with answers { "style": "powder" } at phase 1
    When I send PUT /api/sessions/my-session-id with body:
      """json
      {
        "answers": { "style": "carving", "experience": "advanced" },
        "phase": 2
      }
      """
    And I send GET /api/sessions/my-session-id
    Then the response body field "answers.style" is "carving"
    And the response body field "phase" is 2

  Scenario: Saved session expires after 7 days
    Given I have saved session "expiring-session" 7 days and 1 second ago
    When I send GET /api/sessions/expiring-session
    Then the response body is null

  Scenario: PUT /sessions/:id with phase out of range returns 400
    When I send PUT /api/sessions/my-session-id with body:
      """json
      { "answers": {}, "phase": 5 }
      """
    Then the response status is 400

  Scenario: PUT /sessions/:id with phase below 1 returns 400
    When I send PUT /api/sessions/my-session-id with body:
      """json
      { "answers": {}, "phase": 0 }
      """
    Then the response status is 400

  Scenario: PUT /sessions/:id with non-object answers returns 400
    When I send PUT /api/sessions/my-session-id with body:
      """json
      { "answers": "oops", "phase": 1 }
      """
    Then the response status is 400
```

---

### `features/recommendations/create.feature`

```gherkin
Feature: Create a recommendation
  As a user who has completed the wizard
  I want to generate a recommendation from my answers
  So that I receive a spec sheet and personalized narrative

  Background:
    Given the API is running

  @smoke
  Scenario: Guest user creates a recommendation
    When I send POST /api/recommendations with body:
      """json
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
    And the response body field "specSheet.flexLabel" is one of "Soft", "Medium", "Medium-Stiff", "Stiff"
    And the response body field "specSheet.lengthCm" is a number between 130 and 175
    And the response body field "specSheet.shape" is one of "twin", "directional-twin", "directional", "tapered-directional"
    And the response body field "specSheet.camberProfile" is one of "camber", "rocker", "hybrid", "flat"
    And the response body field "specSheet.baseType" is one of "sintered", "extruded"
    And the response body field "claudeNarrative" is a non-empty string

  Scenario: Authenticated user creates a recommendation linked to their account
    Given I am logged in as "alice@example.com"
    When I send POST /api/recommendations with my JWT and body:
      """json
      {
        "answers": { "style": "freeride", "experience": "expert" },
        "sessionName": "Powder quiver 2026"
      }
      """
    Then the response status is 201
    And the wizard session for this recommendation is associated with "alice@example.com"
    And the session name is "Powder quiver 2026"

  Scenario: Recommendation with no answers still returns a valid spec sheet
    When I send POST /api/recommendations with body:
      """json
      { "answers": {} }
      """
    Then the response status is 201
    And the response body field "specSheet.flexLabel" is a non-empty string

  @security
  Scenario: shareToken is cryptographically random and URL-safe
    When I send POST /api/recommendations twice with identical answers
    Then the two response "shareToken" values are different
    And both tokens match the pattern "^[A-Za-z0-9_-]+$"
    And neither token contains "+" or "/" or "="

  @security
  Scenario: POST /recommendations without Origin header is rejected (CSRF)
    When I send POST /api/recommendations with no Origin or Referer header
    Then the response status is 403

  Scenario: POST /recommendations with missing answers field returns 400
    When I send POST /api/recommendations with body:
      """json
      { "sessionName": "no answers" }
      """
    Then the response status is 400

  Scenario: POST /recommendations with non-object answers returns 400
    When I send POST /api/recommendations with body:
      """json
      { "answers": 42 }
      """
    Then the response status is 400
```

---

### `features/recommendations/retrieve.feature`

```gherkin
Feature: Retrieve a recommendation by ID
  As an authenticated user
  I want to fetch my saved recommendation
  So that I can review or share my spec sheet

  Background:
    Given the API is running
    And a recommendation exists with id "rec-uuid" belonging to "alice@example.com"

  @smoke @auth
  Scenario: Owner retrieves their recommendation
    Given I am logged in as "alice@example.com"
    When I send GET /api/recommendations/rec-uuid with my JWT
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
    When I send GET /api/recommendations/00000000-0000-0000-0000-000000000000 with my JWT
    Then the response status is 404

  Scenario: Invalid UUID format returns 400
    Given I am logged in as "alice@example.com"
    When I send GET /api/recommendations/not-a-uuid with my JWT
    Then the response status is 400
```

---

### `features/recommendations/share.feature`

```gherkin
Feature: Access a recommendation via share token
  As anyone with a share link
  I want to view a recommendation without logging in
  So that I can see the spec sheet a friend shared with me

  Background:
    Given the API is running
    And a recommendation exists with shareToken "abc123-token"

  @smoke
  Scenario: Anyone can view a recommendation by share token without auth
    When I send GET /api/recommendations/share/abc123-token without auth credentials
    Then the response status is 200
    And the response body field "specSheet" is an object
    And the response body field "claudeNarrative" is a non-empty string
    And the response body field "shareToken" is "abc123-token"

  Scenario: Unknown share token returns 404
    When I send GET /api/recommendations/share/does-not-exist
    Then the response status is 404

  Scenario: Share endpoint does not expose the recommendation owner's personal data
    When I send GET /api/recommendations/share/abc123-token
    Then the response body does not contain the field "session.userId"
```

---

### `features/recommendations/pdf.feature`

```gherkin
Feature: PDF export of a recommendation
  As a user
  I want to download my recommendation as a PDF
  So that I can print it to take to a shop

  Background:
    Given the API is running
    And a recommendation exists with id "rec-uuid"

  Scenario: PDF endpoint returns 501 Not Implemented
    When I send GET /api/recommendations/rec-uuid/pdf
    Then the response status is 501
```

---

### `features/journeys/guest-wizard-completion.feature`

```gherkin
Feature: Guest wizard completion end-to-end
  As a visitor who has not logged in
  I want to complete the wizard, get a recommendation, and share it
  Without needing to create an account

  @smoke @journey
  Scenario: Guest completes all wizard phases and receives a shareable recommendation
    Given the API is running
    And I am an unauthenticated guest with session id "guest-abc"

    # Phase 1 — Rider Profile
    When I send POST /api/score with answers:
      """json
      { "experience": "intermediate", "weightCategory": "w_71_85", "stance": "regular" }
      """
    Then the response status is 200
    And the response body field "scores.flex" is a number

    # Cache progress after Phase 1
    When I send PUT /api/sessions/guest-abc with body:
      """json
      { "answers": { "experience": "intermediate", "weightCategory": "w_71_85" }, "phase": 1 }
      """
    Then the response status is 200

    # Phase 2 — Style & Terrain
    When I send POST /api/score with answers:
      """json
      {
        "experience": "intermediate",
        "weightCategory": "w_71_85",
        "style": "all-mountain",
        "terrainMix": "mixed"
      }
      """
    Then the response status is 200

    # Phase 3 — Deep Dive (all-mountain branch)
    When I send POST /api/score with answers:
      """json
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
    When I send POST /api/recommendations with body:
      """json
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
    When I send GET /api/recommendations/share/<my-share-token> without auth
    Then the response status is 200
    And the response body field "specSheet.shape" is a non-empty string

    # Direct ID access without auth is blocked
    When I send GET /api/recommendations/<my-rec-id> without auth
    Then the response status is 401
```

---

### `features/journeys/authenticated-wizard-save-reload.feature`

```gherkin
Feature: Authenticated wizard — save and reload mid-session
  As a logged-in user
  I want to save my wizard progress and reload it after closing the tab
  So that I can pick up where I left off

  @journey
  Scenario: User saves progress mid-wizard and reloads their answers
    Given the API is running
    And I am logged in as "bob@example.com"
    And I have session id "bob-session"

    # Start answering
    When I send PUT /api/sessions/bob-session with body:
      """json
      { "answers": { "experience": "advanced", "style": "freeride" }, "phase": 2 }
      """
    Then the response status is 200

    # Simulate tab close + reopen — fetch from cache
    When I send GET /api/sessions/bob-session
    Then the response status is 200
    And the response body field "answers.experience" is "advanced"
    And the response body field "answers.style" is "freeride"
    And the response body field "phase" is 2

    # Complete the wizard with saved answers
    When I send POST /api/recommendations with my JWT and body:
      """json
      {
        "answers": { "experience": "advanced", "style": "freeride", "weightCategory": "w_86_100" },
        "sessionName": "Freeride setup"
      }
      """
    Then the response status is 201
    And I capture the "id" as "bob-rec-id"

    # Retrieve by ID (JWT-guarded)
    When I send GET /api/recommendations/<bob-rec-id> with my JWT
    Then the response status is 200
    And the response body field "session.name" is "Freeride setup"
    And the response body field "specSheet.shape" is one of "directional", "tapered-directional"
```

---

### `features/journeys/session-claim-on-login.feature`

```gherkin
Feature: Guest session claimed on first login
  As a guest user who completed the wizard before creating an account
  I want my anonymous session to be associated with my new account when I log in
  So that I don't lose my recommendation history

  @journey @security
  Scenario: Guest session is claimed and session fixation is prevented
    Given the API is running
    And a guest wizard session exists with id "guest-session-to-claim"
    And that session belongs to no user

    # Guest logs in and provides their session ID
    When I send POST /api/auth/google with:
      | idToken        | <valid-google-id-token-for-carol@example.com> |
      | guestSessionId | guest-session-to-claim                        |
    Then the response status is 200
    And I capture the "userId" as "carol-user-id"

    # Verify session is now associated with the user
    Then the wizard session "guest-session-to-claim" has userId equal to "carol-user-id"

    # Verify the old guest session identifier is no longer valid as a standalone anonymous session
    # (i.e., the session has been claimed and should not be re-claimable)
    When I send POST /api/auth/google with:
      | idToken        | <valid-google-id-token-for-dave@example.com> |
      | guestSessionId | guest-session-to-claim                       |
    Then the response status is 200
    And the wizard session "guest-session-to-claim" still belongs to "carol-user-id"

  @journey
  Scenario: Login without guestSessionId does not affect existing sessions
    Given a guest wizard session exists with id "unclaimed-session"
    When I send POST /api/auth/google with:
      | idToken | <valid-google-id-token-for-eve@example.com> |
    Then the response status is 200
    And the wizard session "unclaimed-session" still belongs to no user
```

---

## Scenario Count Summary

| Feature file | Scenarios |
|---|---|
| `health.feature` | 5 |
| `auth/google-login.feature` | 7 |
| `auth/token-refresh.feature` | 5 |
| `auth/logout.feature` | 3 |
| `auth/me.feature` | 4 |
| `scoring.feature` | 9 |
| `sessions.feature` | 8 |
| `recommendations/create.feature` | 7 |
| `recommendations/retrieve.feature` | 4 |
| `recommendations/share.feature` | 3 |
| `recommendations/pdf.feature` | 1 |
| `journeys/guest-wizard-completion.feature` | 1 (multi-step) |
| `journeys/authenticated-wizard-save-reload.feature` | 1 (multi-step) |
| `journeys/session-claim-on-login.feature` | 2 |
| **Total** | **60** |

## Gaps and Notes

- **`GET /metrics`** (Prometheus endpoint, outside `/api` prefix): not covered here — belongs in an infrastructure/observability test suite, not a functional API suite.
- **Rate limiting on Claude calls** (`rate:claude:<userId>`, 10/min sliding window): requires a dedicated rate-limit feature file with time-based step definitions; deferred for now.
- **Scoring thresholds**: the `Scenario Outline` in `scoring.feature` validates directional behavior (more weight → higher length score) rather than exact cm values, since thresholds are YAML-configurable and should not be hardcoded in tests.
- **Session fixation**: the security requirement is that the guest session ID must be rotated (old ID invalidated) on claim. The journey scenario covers observable behavior; the underlying DB-level rotation should be verified in the `sessions-claim.service` unit tests.
- **PDF / Puppeteer**: only the 501 stub is tested. Full PDF generation is out of scope until it's implemented.
