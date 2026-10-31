Feature: Authenticated wizard — save and reload mid-session
  As a logged-in user
  I want to save my wizard progress and reload it after closing the tab
  So that I can pick up where I left off

  @journey
  Scenario: User saves progress mid-wizard and reloads their answers
    Given the API is running
    And I am logged in as "bob@example.com"

    # Save progress mid-wizard
    When I send PUT /api/sessions/bob-journey-session with JSON body:
      """
      { "answers": { "experience": "advanced", "style": "freeride" }, "phase": 2 }
      """
    Then the response status is 200

    # Simulate tab close + reopen — fetch from cache
    When I send GET /api/sessions/bob-journey-session
    Then the response status is 200
    And the response body field "answers.experience" is "advanced"
    And the response body field "answers.style" is "freeride"
    And the response body field "phase" is the number 2

    # Complete the wizard
    When I send POST /api/recommendations with my access token and JSON body:
      """
      {
        "answers": { "experience": "advanced", "style": "freeride", "weightCategory": "w_86_100" },
        "sessionName": "Freeride setup"
      }
      """
    Then the response status is 201
    And I capture the "id" from the response as "bob-rec-id"

    # Retrieve by ID (JWT-guarded)
    When I send GET /api/recommendations/<bob-rec-id> with my access token
    Then the response status is 200
    And the response body field "specSheet.shape" is one of "twin,directional-twin,directional,tapered-directional"
