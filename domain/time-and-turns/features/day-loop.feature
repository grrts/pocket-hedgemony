@context-time-and-turns
Feature: The day loop
  As the game
  I want each month played out day by day for every mover at once
  So that armies, fleets and traders meet on the road on the right day

  @TIME-020 @TIME-021
  Scenario: Each day runs move, stop checks, contact and standing orders in that order
    Given the turn is being processed
    When a day of the day loop runs
    Then every marching mover first adds one day to its step
    And then every mover that arrived checks what stops it
    And then hostile armies in the same province make contact
    And then standing orders are applied

  @TIME-022
  Scenario: Fleets and armies share one clock
    Given an enemy fleet arrives in the strait "Bosporus" on day 12
    And an army is due to cross the strait "Bosporus" on day 13
    When the month is played out
    Then the strait is closed to the army on day 13

  @TIME-022
  Scenario: Traders and armies meet on the same day
    Given a trader walks into a province on day 20
    And an enemy army stands in that province on day 20
    When the month is played out
    Then the trader meets the army in that province on day 20

  @TIME-023
  Scenario Outline: Only movement and meetings are daily; supply steps are monthly
    Given the turn is being processed
    When the month is played out
    Then "<step>" runs <cadence>

    Examples:
      | step                          | cadence          |
      | where movers stand            | once a day       |
      | who meets whom                | once a day       |
      | sickness                      | once a month     |
      | sieges                        | once a month     |
      | pay                           | once a month     |

  @TIME-024
  Scenario: Progress on a step carries over into the next month
    Given an army starts a mountain step of 18 days on day 25
    When the month ends
    Then the army still stands in the province it left with 6 days of progress
    And it arrives on day 13 of the next month

  @TIME-025
  Scenario Outline: Armies in a battle don't move while it lasts
    Given a battle starts on day 9 and lasts <days> days
    When the month is played out
    Then the armies in it don't move until day <free>

    Examples:
      | days | free |
      | 1    | 10   |
      | 3    | 12   |

  @TIME-026
  Scenario: A marching army stands in exactly one province every day
    Given an army walking from "Troyes" to "Langres" with 7 days to walk
    When 3 days have passed
    Then the army stands in "Troyes"
    And it can be seen and attacked in "Troyes"
