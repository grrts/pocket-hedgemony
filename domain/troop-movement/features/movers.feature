@context-troop-movement
Feature: One way of moving for armies, ships and traders
  As the game
  I want armies, fleets and traders to move on one graph with one clock and one planner
  So that land and sea movement fit together and meet each other

  @MOVE-100
  Scenario Outline: Every mover has the same fields
    Given a mover of kind "<kind>"
    Then it has a place, a route, progress, a step-days rule, a may-enter rule and a stops-at rule
    And its place is one land province or one sea zone

    Examples:
      | kind       |
      | army       |
      | fleet      |
      | trade ship |
      | trader     |

  @MOVE-101 @MOVE-103
  Scenario: One graph and one planner
    Given land provinces and sea zones are one set of places with their neighbours
    When a fleet plans a route
    Then the same planner is used with the fleet's step-days and may-enter rules

  @MOVE-102
  Scenario: One clock
    Given an enemy fleet arrives in a strait on day 12
    When an army tries to cross that strait by ferry on day 13
    Then the crossing is closed

  @MOVE-102 @MOVE-109
  Scenario: A trader meets an army
    Given an enemy army stands in "Troyes"
    When a trader walks into "Troyes" on day 20
    Then the trader's stops-at rule reacts to the army on day 20

  @MOVE-104
  Scenario Outline: Ports join land and sea
    Given the province "Lagos" has a harbour on a shore tile
    When a <mover> tries to step between "Lagos" and its sea zone
    Then it <result>

    Examples:
      | mover               | result                       |
      | fleet               | may enter through the harbour |
      | army not aboard     | may not                      |

  @MOVE-105 @placeholder
  Scenario Outline: Boarding ships
    Given an army of <men> men in a port with enough of <owner> ships
    When it boards
    Then boarding takes <days> days
    And the army is cargo and moves with the fleet

    Examples:
      | men   | owner        | days |
      | 5000  | its own      | 1    |
      | 15000 | an ally's    | 3    |

  @MOVE-106 @placeholder
  Scenario Outline: Landing
    Given a fleet carrying 10000 men is in a sea zone next to <coast>
    When it lands the army
    Then landing takes <days> days
    And the army is a mover again and the stop checks apply

    Examples:
      | coast              | days |
      | a port province    | 2    |
      | a coast with no port | 4  |

  @MOVE-107
  Scenario Outline: Routes across water
    Given the player drags the army "A" route across water
    And the player <ships> ships that can carry it
    Then <result>

    Examples:
      | ships        | result                                                          |
      | has          | the planner gives a combined route: march, board, sail, land, march on |
      | has no       | the route stops at the coast with "needs ships"                 |

  @MOVE-108
  Scenario: Food at sea
    Given the army "A" is aboard ships
    When a month passes
    Then it eats from its reserve, as abroad

  @MOVE-109
  Scenario: Raiders attack traders
    Given the horse-only army "A" is on Raid
    When it passes through a province with an enemy trader
    Then it can attack the trader, the amount set by the trade rules

  @MOVE-110
  Scenario: Roads built for armies speed trade
    Given a road is built in "Troyes"
    Then trader step days into "Troyes" use the road factor too
