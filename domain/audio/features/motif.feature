@context-audio
Feature: The Hegemony motif
  As a player
  I want one five-note motif running through every track and the turn chimes
  So that the soundtrack feels like one piece of work

  @AUD-011
  Scenario Outline: Every track quotes the motif
    Given the track "<track>"
    Then the motif 1 – 5 – 4 – 5 – 1↑ appears at least once

    Examples:
      | track |
      | title |
      | peace_westafrica_early |
      | war_campaign |

  @AUD-012
  Scenario: The title states it and age stingers end on it
    Given the track list
    Then the track "title" states the motif plainly
    And every "age_" stinger ends on the motif

  @AUD-013
  Scenario: The turn chimes split the motif
    When the player presses End turn
    Then "turn_end" plays motif notes 1 – 5
    When the new turn is ready
    Then "turn_ready" answers with motif notes 4 – 5 – 1↑
