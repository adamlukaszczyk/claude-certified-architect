Feature: In-progress wizard session cache
  As a wizard user
  I want my partial answers cached between page loads
  So that I can resume a session without losing progress

  Background:
    Given the API is running

  @smoke
  Scenario: Save wizard answers and phase to cache
    When I send PUT /api/sessions/my-session-id with JSON body:
      """
      {
        "answers": { "style": "powder", "experience": "intermediate" },
        "phase": 2
      }
      """
    Then the response status is 200

  @smoke
  Scenario: Retrieve previously saved wizard answers
    Given I have saved session "my-session-id" with answers and phase 2:
      """
      { "style": "powder" }
      """
    When I send GET /api/sessions/my-session-id
    Then the response status is 200
    And the response body field "answers.style" is "powder"
    And the response body field "phase" is the number 2

  Scenario: Retrieving a non-existent session returns null
    When I send GET /api/sessions/does-not-exist
    Then the response status is 200
    And the response body is null

  Scenario: Overwriting a session replaces the previous answers
    Given I have saved session "my-session-id" with answers and phase 1:
      """
      { "style": "powder" }
      """
    When I send PUT /api/sessions/my-session-id with JSON body:
      """
      {
        "answers": { "style": "carving", "experience": "advanced" },
        "phase": 2
      }
      """
    And I send GET /api/sessions/my-session-id
    Then the response body field "answers.style" is "carving"
    And the response body field "phase" is the number 2

  Scenario: Saved session expires after 7 days
    Given I have saved session "expiring-session" 7 days and 1 second ago
    When I send GET /api/sessions/expiring-session
    Then the response body is null

  Scenario: PUT /sessions/:id with phase above 4 returns 400
    When I send PUT /api/sessions/my-session-id with JSON body:
      """
      { "answers": {}, "phase": 5 }
      """
    Then the response status is 400

  Scenario: PUT /sessions/:id with phase below 1 returns 400
    When I send PUT /api/sessions/my-session-id with JSON body:
      """
      { "answers": {}, "phase": 0 }
      """
    Then the response status is 400

  Scenario: PUT /sessions/:id with non-object answers returns 400
    When I send PUT /api/sessions/my-session-id with JSON body:
      """
      { "answers": "oops", "phase": 1 }
      """
    Then the response status is 400
