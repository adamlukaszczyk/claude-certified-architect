Feature: Guest session claimed on first login
  As a guest user who completed the wizard before creating an account
  I want my anonymous session to be associated with my new account when I log in
  So that I do not lose my recommendation history

  @journey @security
  Scenario: Guest session is claimed and cannot be re-claimed by another user
    Given the API is running
    And a guest wizard session exists with id "claimable-session-id"
    And that session belongs to no user

    # First login claims the session
    When I send POST /api/auth/google with body:
      | idToken        | <valid-google-id-token-for-carol@example.com> |
      | guestSessionId | claimable-session-id                          |
    Then the response status is 200
    And I capture the "userId" from the response as "carol-user-id"
    And the wizard session "claimable-session-id" is now associated with user id "carol-user-id"

    # Second user attempting to claim the already-claimed session does not hijack it
    When I send POST /api/auth/google with body:
      | idToken        | <valid-google-id-token-for-dave@example.com> |
      | guestSessionId | claimable-session-id                         |
    Then the response status is 200
    And the wizard session "claimable-session-id" still belongs to user id "carol-user-id"

  @journey
  Scenario: Login without guestSessionId does not affect existing unclaimed sessions
    Given the API is running
    And a guest wizard session exists with id "unclaimed-session-id"
    And that session belongs to no user
    When I send POST /api/auth/google with body:
      | idToken | <valid-google-id-token-for-eve@example.com> |
    Then the response status is 200
    And the wizard session "unclaimed-session-id" still belongs to no user
