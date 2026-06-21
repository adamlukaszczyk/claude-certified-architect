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
