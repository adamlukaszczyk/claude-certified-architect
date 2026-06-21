Feature: Incremental wizard scoring
  As a wizard user
  I want my answers to be scored in real time
  So that the live profile sidebar updates after each selection

  Background:
    Given the API is running

  @smoke
  Scenario: Empty answers return all-zero partial scores
    When I send POST /api/score with JSON body:
      """
      {}
      """
    Then the response status is 200
    And the response body field "scores.flex" is the number 0
    And the response body field "scores.length" is the number 0
    And the response body field "scores.camber" is the number 0

  Scenario: Powder riding style produces positive taper, float and shape scores
    When I send POST /api/score with JSON body:
      """
      { "style": "powder" }
      """
    Then the response status is 200
    And the response body field "scores.taper" is greater than 0
    And the response body field "scores.float" is greater than 0
    And the response body field "scores.shape" is greater than 0

  Scenario: Freestyle riding style produces a negative flex score
    When I send POST /api/score with JSON body:
      """
      { "style": "freestyle" }
      """
    Then the response status is 200
    And the response body field "scores.flex" is less than 0

  Scenario: Carving riding style produces a positive camber score
    When I send POST /api/score with JSON body:
      """
      { "style": "carving" }
      """
    Then the response status is 200
    And the response body field "scores.camber" is greater than 0

  Scenario: Beginner experience reduces flex score
    When I send POST /api/score with JSON body:
      """
      { "experience": "beginner" }
      """
    Then the response status is 200
    And the response body field "scores.flex" is less than 0

  Scenario Outline: Weight category influences length and flex scores
    When I send POST /api/score with JSON body:
      """
      { "weightCategory": "<weight>" }
      """
    Then the response body field "scores.length" is <length_dir> 0
    And the response body field "scores.flex" is <flex_dir> 0

    Examples:
      | weight    | length_dir   | flex_dir     |
      | under_55  | less than     | less than    |
      | over_100  | greater than  | greater than |

  @security
  Scenario: POST /score without Origin header is rejected (CSRF)
    Given the next request will have no Origin or Referer header
    When I send POST /api/score with JSON body:
      """
      {}
      """
    Then the response status is 403

  Scenario: Non-object answers field returns 400
    When I send POST /api/score with JSON body:
      """
      { "answers": "not-an-object" }
      """
    Then the response status is 400

  Scenario: Missing answers field returns 400
    When I send POST /api/score with an empty body
    Then the response status is 400
