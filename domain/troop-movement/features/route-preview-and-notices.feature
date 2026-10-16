@context-troop-movement
Feature: What the route preview and the month replay carry
  As a player
  I want the route and the month's replay to tell me where my armies will be and what changed
  So that I can plan a monthly turn and only read what matters

  @MOVE-094
  Scenario: The route shows days and month marks
    Given the army "A" plans a route from "Paris" through "Troyes" and "Langres" to "Dijon"
    And the steps take 10, 12 and 10 days
    Then the preview shows day counts 10, 22 and 32 and a total of 32
    And a month mark lies between "Langres" and "Dijon"

  @MOVE-094
  Scenario Outline: Step icons
    Given a step of the route <condition>
    Then the step shows the icon "<icon>"

    Examples:
      | condition                         | icon               |
      | enters a river province           | river              |
      | crosses a snow pass               | snow pass          |
      | ends at a stopping castle         | castle             |
      | needs passage across a border     | border             |
      | has an enemy army seen on it      | enemy army         |
      | changes days by season            | snowflake or rain  |

  @MOVE-093
  Scenario: Changing a setting redraws the days
    Given the army "A" has a route of 20 days on pace "Normal"
    When the player sets pace "Forced" on the order pill
    Then the route and its days are redrawn at once

  @MOVE-093
  Scenario Outline: Confirming a route
    Given the route was set by <how>
    Then it is confirmed <when>

    Examples:
      | how                  | when                         |
      | tapping a province   | when the player taps March   |
      | dragging             | on lift                      |

  # config: replaySecondsPer10Days
  @MOVE-097 @placeholder @open-question
  # OQ-MOVE-8: whether a battle pauses the turn
  Scenario: Watching the month
    When the turn ends
    Then the month plays at about one second per 10 days with a skip button
    And battles flash crossed swords and pause half a second
    And castles that stop an army ring red

  @MOVE-098
  Scenario Outline: Only plan-changing events give a notice
    Given during the month <event>
    Then the player <gets> a notice

    Examples:
      | event                                                        | gets         |
      | an army stopped short of its destination at a castle         | gets         |
      | a battle was fought                                          | gets         |
      | an army's route turned red                                   | gets         |
      | an enemy army was first seen marching into the realm's land  | gets         |
      | an army walked where it was told                             | does not get |
