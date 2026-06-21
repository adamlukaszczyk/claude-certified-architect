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
