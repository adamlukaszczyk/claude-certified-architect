Feature: PDF export of a recommendation
  As a user
  I want to download my recommendation as a PDF
  So that I can print it to take to a shop

  Background:
    Given the API is running

  Scenario: PDF endpoint returns 501 Not Implemented
    When I send GET /api/recommendations/00000000-0000-0000-0000-000000000001/pdf
    Then the response status is 501
