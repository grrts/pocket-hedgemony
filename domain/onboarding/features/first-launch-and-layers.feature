@context-onboarding
Feature: First launch and the four layers
  As a new player
  I want to choose how much teaching I get
  So that I start the way that suits me

  @TUT-104
  Scenario Outline: The first-launch question
    Given the game is launched for the first time
    When the player taps to start for the first time
    Then the game asks "New to Pocket Hegemony?"
    When the player picks "<option>"
    Then <result>

    Examples:
      | option | result |
      | Play the tutorial | the tutorial starts at chapter 0 |
      | Guided campaign | a normal campaign starts with guided first turns |
      | I know the way | a normal campaign starts |

  @TUT-009 @TUT-010
  Scenario: Layers left after skipping everything
    Given the player picked "I know the way"
    And the player closed the goals list for good
    Then the Needs attention list is available
    And every number has a tooltip and a "Why?"
    And the Almanac opens from the pause menu
