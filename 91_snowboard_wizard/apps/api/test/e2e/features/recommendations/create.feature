Feature: Create a recommendation
  As a user who has completed the wizard
  I want to generate a recommendation from my answers
  So that I receive a spec sheet and personalized narrative

  Background:
    Given the API is running

  @smoke
  Scenario: Guest user creates a recommendation
    When I send POST /api/recommendations with JSON body:
      """
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
    And the response body field "specSheet.flexLabel" is one of "Soft,Medium,Medium-Stiff,Stiff"
    And the response body field "specSheet.lengthCm" is a number between 130 and 175
    And the response body field "specSheet.shape" is one of "twin,directional-twin,directional,tapered-directional"
    And the response body field "specSheet.camberProfile" is one of "rocker,flat-to-rocker,hybrid,camber,aggressive-camber"
    And the response body field "specSheet.baseType" is one of "sintered,extruded"
    And the response body field "claudeNarrative" is a non-empty string

  Scenario: Authenticated user creates a recommendation linked to their account
    Given I am logged in as "alice@example.com"
    When I send POST /api/recommendations with my access token and JSON body:
      """
      {
        "answers": { "style": "freeride", "experience": "expert" },
        "sessionName": "Powder quiver 2026"
      }
      """
    Then the response status is 201
    And the wizard session for this recommendation is associated with "alice@example.com"
    And the session name is "Powder quiver 2026"

  Scenario: Recommendation with empty answers returns a valid spec sheet
    When I send POST /api/recommendations with JSON body:
      """
      { "answers": {} }
      """
    Then the response status is 201
    And the response body field "specSheet.flexLabel" is a non-empty string

  @security
  Scenario: Two recommendations from identical answers have different share tokens
    When I send POST /api/recommendations with JSON body:
      """
      { "answers": { "style": "powder" } }
      """
    And I capture the "shareToken" from the response as "token-one"
    And I send POST /api/recommendations with JSON body:
      """
      { "answers": { "style": "powder" } }
      """
    And I capture the "shareToken" from the response as "token-two"
    Then the captured values "token-one" and "token-two" are different
    And the captured value "token-one" matches the pattern "^[A-Za-z0-9_-]+$"
    And the captured value "token-two" matches the pattern "^[A-Za-z0-9_-]+$"

  @security
  Scenario: POST /recommendations without Origin header is rejected (CSRF)
    Given the next request will have no Origin or Referer header
    When I send POST /api/recommendations with JSON body:
      """
      { "answers": {} }
      """
    Then the response status is 403

  Scenario: POST /recommendations with missing answers field returns 400
    When I send POST /api/recommendations with JSON body:
      """
      { "sessionName": "no answers" }
      """
    Then the response status is 400

  Scenario: POST /recommendations with non-object answers returns 400
    When I send POST /api/recommendations with JSON body:
      """
      { "answers": 42 }
      """
    Then the response status is 400
