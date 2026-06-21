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
