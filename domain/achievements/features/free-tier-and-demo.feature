@context-achievements
Feature: Achievements in the free tier and the Steam demo
  As a player who starts free
  I want what I earn to carry over when I buy the game
  So that I never have to earn it twice

  @ACH-054
  Scenario: The mobile free download earns and keeps achievements
    Given the player uses the iOS free download
    And the player plays an ironman campaign as the country "France"
    When the achievement "first_harvest" unlocks
    And the player buys the full game
    Then "first_harvest" stays earned

  @ACH-055
  Scenario Outline: Full-game achievements need countries outside the free tier
    Given the player uses the Android free download
    Then the achievement "<id>" can't be earned with the free countries alone

    Examples:
      | id |
      | many_crowns |
      | every_macro_region |

  # The free set is decided (Ottomans, France) but the design still calls it open (OQ-ACH-3).
  @ACH-056 @open-question
  Scenario: From One Hall needs the full game when no free country starts with one province
    Given no free country starts with a single province
    Then the achievement "from_one_hall" is marked full_game

  @ACH-057
  Scenario: The Steam demo awards nothing directly
    Given the player plays an ironman campaign in the Steam demo
    When the achievement "first_regiment" is earned
    Then nothing is sent to Steam
    And the demo keeps "first_regiment" in its local list

  @ACH-057
  Scenario: A normal campaign in the demo earns nothing
    Given the player plays a normal campaign in the Steam demo
    When the moment "harvest" occurs for the first time
    Then the demo's local list stays empty

  @ACH-058
  Scenario: Buying the full game awards what the demo earned
    Given the demo's profile lists "first_regiment" and "reach_1500"
    When the player buys the full game and starts it
    Then the full game reads the demo's profile
    And "first_regiment" and "reach_1500" are awarded
