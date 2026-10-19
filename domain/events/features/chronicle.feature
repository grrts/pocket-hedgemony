@context-events
Feature: The Chronicle
  As a player
  I want to see the turning points of history and whether the world is heading toward them
  So that I can read history's course at a glance

  @EVT-094 @EVT-095 @EVT-096
  Scenario: A turning point ahead is on course, with the realms heading there
    Given the date is 11 November 1444
    And the Ottomans have the goal "Take Constantinople" leading toward the Fall of Constantinople
    Then the Chronicle shows the Fall of Constantinople ahead, on course, history 1453
    And it names the Ottomans and their goal as heading there

  @EVT-095
  Scenario: A turning point that happened late
    Given the Fall of Constantinople happened in 1470
    Then the Chronicle shows it happened in 1470, late

  @EVT-095
  Scenario: A turning point is bent when the goals leading to it have gone
    Given the Ottomans' goal "Take Constantinople" was dropped by the seed's shake
    Then the Chronicle shows the Fall of Constantinople as bent

  @EVT-095
  Scenario: A turning point overdue is bent
    Given the date is 1470 and the Fall of Constantinople has not happened
    Then the Chronicle shows the Fall of Constantinople as bent

  @EVT-095
  Scenario: A turning point that can no longer happen is gone
    Given the Fall of Constantinople's event is invalidated
    Then the Chronicle shows the Fall of Constantinople as gone
