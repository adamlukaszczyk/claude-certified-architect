Feature: Access token refresh
  As an authenticated user
  I want my session to be silently renewed
  So that I stay logged in without re-authenticating

  Background:
    Given the API is running
    And I am logged in as "alice@example.com"

  @auth
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
