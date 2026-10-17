@context-troop-movement
Feature: March orders and route settings
  As a player or AI country
  I want a short list of march orders and route settings sent as data
  So that every army can be moved the same way by anyone

  @MOVE-076
  Scenario Outline: Orders every army has
    Given the army "A" is an ordinary army
    Then the order "<order>" is offered

    Examples:
      | order         |
      | March to      |
      | March by      |
      | Halt          |
      | Return home   |
      | Follow / Join |

  @MOVE-077
  Scenario: March to takes the fastest route
    Given two routes from "Paris" to "Dijon" of 19 and 24 days
    When the army "A" is ordered "March to" "Dijon"
    Then it takes the 19-day route

  @MOVE-076
  Scenario: March by goes through waypoints
    When the army "A" is ordered "March by" "Sens" to "Dijon"
    Then its route passes through "Sens"

  @MOVE-078
  Scenario: Halt keeps the rest of the route
    Given the army "A" is on a route to "Dijon"
    When it is ordered "Halt" in "Troyes"
    Then it stands in "Troyes"
    And the rest of its route is kept, greyed

  @MOVE-079
  Scenario: Return home
    Given the nearest own province with a castle is "Troyes"
    When the army "A" is ordered "Return home"
    Then it takes the fastest route to "Troyes"

  @MOVE-080
  Scenario: Join a friendly army
    When the army "A" is ordered to follow the friendly army "B"
    Then it follows "B" and joins it when they meet

  @MOVE-081
  Scenario Outline: Raid only for horse-only armies
    Given the army "A" is <kind>
    Then the order "Raid" is <offered>

    Examples:
      | kind               | offered     |
      | horse only         | offered     |
      | foot and horse     | not offered |

  @MOVE-081 @open-question
  # OQ-MOVE-12: how the week per province combines with raid step days
  Scenario: A raid spends a week in each province
    Given the horse-only army "A" raids along a route
    Then it spends a week in each province it passes

  @MOVE-082
  Scenario: Besiege holds the army
    Given the army "A" stands in a province with an enemy castle
    When it is ordered "Besiege"
    Then it can't march on until the castle falls

  @MOVE-083
  Scenario Outline: Board ships and land
    Given the army "A" is <where>
    Then the order "<order>" is offered

    Examples:
      | where                 | order       |
      | in a port with ships  | Board ships |
      | at sea                | Land        |

  @MOVE-084
  Scenario Outline: Route settings are remembered per army
    When the army "A" is set to pace "<pace>" and on the way "<on_the_way>"
    And it is given a new route later
    Then it keeps pace "<pace>" and on the way "<on_the_way>"

    Examples:
      | pace    | on_the_way                     |
      | Normal  | keep marching                  |
      | Forced  | halt when the enemy is seen    |
      | Careful | attack what we see             |

  @MOVE-085 @MOVE-086
  Scenario: The AI uses the same orders as data
    Given the AI country "Burgundy" moves an army
    Then it sends the same order data a player would
    And its standing orders are set by its personality
