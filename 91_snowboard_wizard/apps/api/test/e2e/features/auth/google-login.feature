Feature: Google OAuth login
  As a user who has completed the wizard
  I want to log in with my Google account
  So that I can save and revisit my recommendations

  Background:
    Given the API is running
    And a valid Google ID token exists for "alice@example.com"

  @auth
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
