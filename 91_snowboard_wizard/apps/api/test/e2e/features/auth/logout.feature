Feature: Logout
  As an authenticated user
  I want to log out
  So that my session is terminated across all devices

  Background:
    Given the API is running
    And I am logged in as "alice@example.com"

  @auth
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
