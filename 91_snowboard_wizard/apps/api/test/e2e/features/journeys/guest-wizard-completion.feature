Feature: Guest wizard completion end-to-end
  As a visitor who has not logged in
  I want to complete the wizard, get a recommendation, and share it
  Without needing to create an account

  @smoke @journey
  Scenario: Guest completes all wizard phases and receives a shareable recommendation
    Given the API is running
    And I have no auth credentials

    # Phase 1 — Rider Profile scoring
    When I send POST /api/score with JSON body:
      """
      { "experience": "intermediate", "weightCategory": "w_71_85", "stance": "regular" }
      """
    Then the response status is 200
    And the response body field "scores.flex" is a number

    # Cache progress after Phase 1
    When I send PUT /api/sessions/guest-journey-session with JSON body:
      """
      { "answers": { "experience": "intermediate", "weightCategory": "w_71_85" }, "phase": 1 }
      """
    Then the response status is 200

    # Phase 2 — Style scoring
    When I send POST /api/score with JSON body:
      """
      {
        "experience": "intermediate",
        "weightCategory": "w_71_85",
        "style": "all-mountain",
        "terrainMix": "mixed"
      }
      """
    Then the response status is 200

    # Phase 3 — Deep Dive scoring
    When I send POST /api/score with JSON body:
      """
      {
        "experience": "intermediate",
        "weightCategory": "w_71_85",
        "style": "all-mountain",
        "terrainMix": "mixed",
        "speedPreference": "moderate"
      }
      """
    Then the response status is 200

    # Generate recommendation
    When I send POST /api/recommendations with JSON body:
      """
      {
        "answers": {
          "experience": "intermediate",
          "weightCategory": "w_71_85",
          "style": "all-mountain"
        }
      }
      """
    Then the response status is 201
    And I capture the "shareToken" from the response as "my-share-token"
    And I capture the "id" from the response as "my-rec-id"

    # Share link is publicly accessible
    When I send GET /api/recommendations/share/<my-share-token> without auth credentials
    Then the response status is 200
    And the response body field "specSheet.shape" is a non-empty string

    # Direct ID access without auth is blocked
    When I send GET /api/recommendations/<my-rec-id> without auth credentials
    Then the response status is 401
