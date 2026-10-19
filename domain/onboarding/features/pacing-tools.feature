@context-onboarding
Feature: Pacing tools the tutorial adds
  As a new player
  I want the tutorial to skip waiting, keep me focused and keep the world quiet
  So that each lesson fits a short session

  @TUT-019
  Scenario: Advance to the harvest
    Given chapter 6 offers "Advance to the harvest, September 1381"
    When the player takes the Advance to… ribbon
    Then the turns run in a row until the harvest month
    And one combined turn report is shown

  @TUT-020
  Scenario: Input focus during a do step
    Given the step "ch6.open_food_policy" allows only "ui.country_card.food" and "camera"
    When the player taps the levy button
    Then nothing happens
    And the levy button is dimmed, not hidden

  @TUT-021
  Scenario: Free look lifts the focus
    Given a do step with input focus is shown
    When the player presses Free look
    Then every control responds for the rest of that step

  @TUT-022
  Scenario Outline: The quiet world holds back wars
    Given the tutorial is running
    And the AI country "<country>" wants a war "<target>"
    Then the war is held back

    Examples:
      | country | target |
      | Karaman | against the Ottomans |
      | Germiyan | in western Anatolia |
      | Serbia | in the Balkans |

  @TUT-022
  Scenario: Scripted wars still happen
    Given the tutorial is running
    When John V reaches Murad in chapter 4
    Then the war for John V's throne goes on

  @TUT-023 @placeholder
  Scenario: The clash before Pera at watch speed
    When the clash before Pera starts in chapter 5
    Then the battle screen opens
    And one bell plays every 3 seconds
