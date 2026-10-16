@context-time-and-turns
Feature: Battles inside the month
  As a player
  I want each battle handled on its own, in the order it happens
  So that I can watch my battles without losing the flow of the month

  @TIME-027 @TIME-031
  Scenario: Battles are resolved one at a time in the order they happen
    Given battles happen on day 9 in "Langres" and on day 22 in "Langres"
    When the month is played out
    Then the battle of day 9 is resolved before the battle of day 22
    And each result is ready before it is shown

  @TIME-028 @open-question
  # OQ-TIME-3: screen-flow (stop at the battle) against warfare 7.15 (report with Watch) and troop-movement 10.6
  Scenario: The month stops at the player's battle and resumes on Carry on
    Given the player's army under "Jean de Dunois" and the army of "the Bastard of Burgundy" both stand in "Langres" at the end of day 22
    When the month reaches day 22
    Then the turn stops on that battle
    And the day loop continues only after the player carries on

  @TIME-029
  Scenario: Battles between other realms never stop the turn
    Given the countries "Castile" and "Navarre" fight a battle on day 5
    And the player is "France"
    When the month is played out
    Then the turn does not stop for that battle

  @TIME-030 @TIME-034
  Scenario: A turn killed at a battle replays to the same battle with the same result
    Given the turn stopped at the player's battle in "Langres" on day 22
    And the app was killed before the player carried on
    When the campaign is resumed from the pre-turn save with the same orders
    Then the month reaches the battle in "Langres" on day 22 again
    And the battle has the same result
