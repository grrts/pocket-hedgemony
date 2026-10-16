@context-onboarding
Feature: Guided first turns
  As a player starting a real campaign
  I want a short list of first-year goals that each point at one screen
  So that I find every core screen once

  @TUT-065
  Scenario Outline: Who sees the goals list
    Given the player <history>
    When the player starts a campaign
    Then the goals list sits under the top bar for the first in-game year

    Examples:
      | history |
      | skipped the tutorial |
      | finished the tutorial and starts the first real campaign |

  @TUT-066
  Scenario Outline: Goals tick off
    Given the goal "<goal>" is open
    When <action>
    Then the goal "<goal>" ticks off

    Examples:
      | goal | action |
      | Look over your realm | the player opens the country card |
      | Choose how your castles share food | the player chooses a Food policy preset or setting |
      | Check your lords | the player opens the lords list |
      | Put an official in every royal province | no royal province is without an official |
      | Choose what your scholars study | the player chooses an invention |
      | Know your neighbours | the player opens the realms around them from the country card |
      | End your first turn | the player presses End turn |

  @TUT-066
  Scenario: The officials goal can be dismissed
    Given the goal "Put an official in every royal province" is open
    When the player dismisses it
    Then the goal ticks off

  @TUT-067
  Scenario: The list folds away
    When the player folds the goals list
    Then it shows a single icon with the count of open goals
    And it never covers the map

  @TUT-068
  Scenario: Show me runs the tutorial steps in this campaign
    Given a campaign as the country "France"
    When the player presses Show me on "Choose how your castles share food"
    Then the matching tutorial steps run in this campaign
    And no tutorial scenario override is applied

  @TUT-069
  Scenario: Goals adapt to the realm
    Given the player's realm has no lords
    Then the goal "Check your lords" is not listed

  @TUT-070
  Scenario: Closed for good
    When the player closes the goals list for good from its menu
    Then the goals list does not appear again in that campaign
