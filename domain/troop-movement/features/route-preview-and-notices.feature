@context-troop-movement
Feature: What the route preview and the turn replay carry
  As a player
  I want the route and the turn's replay to tell me where my armies will be and what changed
  So that I can plan a weekly turn and only read what matters

  @MOVE-094
  Scenario: The route shows days and turn marks
    Given the army "A" plans a route from "Paris" through "Troyes" and "Langres" to "Dijon"
    And the steps take 10, 12 and 10 days
    Then the preview shows day counts 10, 22 and 32 and a total of 32
    And turn marks lie between "Paris" and "Troyes", twice between "Troyes" and "Langres", and between "Langres" and "Dijon"

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

  # config: replaySecondsPer10Days, battleSteps; X-1: the player's battles slow the turn, AI battles never do
  @MOVE-097 @MOVE-113 @placeholder
  Scenario: Watching the turn
    Given the player's army "A" of "France" will meet the enemy army "B" in "Langres" on day 1
    And the AI armies "C" of "Burgundy" and "D" of "Savoy" will fight in "Dijon" on day 1
    And a castle of "Burgundy" will stop the French army "E" in "Beaune"
    When the turn ends
    Then the turn plays at about one second per 10 days with a skip button
    And the battle in "Dijon" flashes crossed swords and pauses half a second without slowing the turn
    And day 1 slows to six 4-hour steps while the battle in "Langres" runs
    And at each step the player can change standing orders, order a retreat or switch battle, and there is no Skip to result
    And the castle of "Beaune" rings red

  @MOVE-098
  Scenario Outline: Only plan-changing events give a notice
    Given during the turn <event>
    Then the player <gets> a notice

    Examples:
      | event                                                        | gets         |
      | an army stopped short of its destination at a castle         | gets         |
      | a battle was fought                                          | gets         |
      | an army's route turned red                                   | gets         |
      | an enemy army was first seen marching into the realm's land  | gets         |
      | an army walked where it was told                             | does not get |

  @MOVE-129 @feedback-76
  Scenario: The map marks land the chosen armies may not enter
    Given a new game on the real map as the realm "France"
    Then the engine reports which provinces the realm's armies may not enter
    And the realm's own land and the sea are never marked closed
    And the land of a realm at peace with it that grants no passage is marked closed
