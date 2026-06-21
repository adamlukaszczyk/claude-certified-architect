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
