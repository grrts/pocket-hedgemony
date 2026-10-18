@context-national-strengths
Feature: Heritage card
  As a player
  I want my country's heritage on one small card
  So that I can see what my country is good at, wants and struggles with

  @HER-001 @HER-002
  Scenario: The heritage card of Venice
    Given the country "Venice" has the birthright "Lagoon and Arsenal"
    And the heyday "The mude to Alexandria" is awake in the "Age of Gunpowder Empires"
    And "Venice" has 3 active ambitions, one of them stirred and warm
    And "Venice" carries the burden "The feared lion" and has no legacies
    When the player opens the heritage card of "Venice"
    Then the card shows the rows Birthright, Heyday, Ambitions, Burden and Legacies and no more
    And the Legacies row says "none yet"
    And tapping a row shows its full text, its history note and what it changes

  @HER-003
  Scenario: Every line changes something countable
    Given the country "Venice" has the birthright "Lagoon and Arsenal"
    When its effects are applied
    Then galleys build 30 % faster, the capital's garrison is 40 % stronger and ports raise 15 % more sailors

  @HER-004
  Scenario: Our own system
    Given the heritage of every country
    When the heritage is built
    Then no heritage part uses a mechanic, name or value from another game
