@context-multiplayer
Feature: Simultaneous weeks
  As a player in a campaign with other people
  I want everyone to plan the same week at once
  So that nobody waits through another player's whole turn or sees their moves first

  Background:
    Given a multiplayer campaign with the human realms "Castile" and "Portugal"

  @MP-001 @MP-003
  Scenario: Both players plan the same week from the same start
    Given the week begins with the same world on both devices
    When "Castile" and "Portugal" each give orders and press Ready
    Then each device goes back to the start of the week
    And carries out both realms' orders in the resolution order
    And plays the week

  @MP-002
  Scenario: An order acts at once while planning
    When "Castile" moves an army while planning
    Then the army is on its way on Castile's device before Ready

  @MP-004
  Scenario Outline: The resolution order turns each week
    Given the human realms are numbered <humans>
    When week <week> is resolved
    Then the orders are carried out in the order <order>

    Examples:
      | humans  | week | order   |
      | 3, 7    | 0    | 3, 7    |
      | 3, 7    | 1    | 7, 3    |
      | 3, 7, 9 | 2    | 9, 3, 7 |

  @MP-005
  Scenario: A new army keeps taking orders when another player's order took its number
    Given "Portugal" comes before "Castile" in this week's resolution order
    And both realms split an army while planning
    When the week is resolved
    Then Castile's later order for its new army moves the army Castile's split made

  @MP-006
  Scenario: An order that can no longer be carried out is skipped
    Given "Portugal" hires the last free company while planning
    And "Castile" hires the same company while planning
    And "Portugal" comes first in this week's resolution order
    When the week is resolved
    Then Castile's hire is not done and Castile is told why

  @MP-007
  Scenario: Humans choose for themselves
    When an event reaches "Portugal"
    Then the AI does not answer it
    And it waits for Portugal's player in the next planning

  @MP-008
  Scenario: Peace between two players is asked and answered
    Given "Castile" is at war with "Portugal"
    When Castile's player offers peace to "Portugal"
    Then the offer reaches Portugal's Dispatches the next week
    And only Portugal's player can accept or refuse it

  @MP-009 @MP-010
  Scenario: The week does not stop
    When an event fires for "Castile" in the middle of the week
    Then the week plays on to its end
    And Ready stays blocked for Castile until the event is answered
    And auto turns, saving and achievements are off

  @MP-011
  Scenario: Every device agrees on the next week's start
    When the week has been played on both devices
    Then both devices have the same week-start hash

  @MP-012
  Scenario: Orders act for the realm that sent them
    Given Portugal's week's orders name the realm "Castile"
    When the week is resolved
    Then they are carried out as orders of "Portugal"
