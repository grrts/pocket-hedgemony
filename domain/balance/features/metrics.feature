@context-balance
Feature: Metrics
  As the game's developers
  I want the same numbers read from every realm and the world each January
  So that runs can be compared and checked

  @BAL-010
  Scenario: Realm metrics each January
    Given a balance run is being played
    When a January turn ends
    Then for every realm the run records provinces owned and held as subjects, people, the three scores, treasury, debt, income and spending by ledger line
    And soldiers and those lost that year by battle, hunger, sickness and desertion
    And wars declared, joined, won and lost, Lands taken, notoriety, leagues against it, its neighbours' mean standing, its weakest stability pillar, rebels risen and inventions known

  @BAL-011
  Scenario: World metrics each January
    Given a balance run is being played
    When a January turn ends
    Then the run records realms alive, the largest realm's share of settled land, provinces that changed owner by war, by demand and by diplomacy
    And wars started, wars ended and how they ended, the mean length of ended wars, and leagues standing

  @BAL-012
  Scenario: Return on gold per path
    Given the probe realm "France" spent 4000 gold on war and 2000 gold on works over a run
    And its Power score rose by 120 and its Economy score by 60 in the same run
    When the return on gold is worked out
    Then the report gives France a return on gold for war, works, learning and diplomacy, each per 100 gold spent
