@context-trade
Feature: Routes
  As a player
  I want to give each trader a start and an end
  So that it finds its way through the busiest land, collects and comes home on its own

  @TRADE-049 @placeholder
  Scenario Outline: Only cities can be stops
    Given the province "<province>" is a "<size>" <market>
    When the trade rules are applied
    Then "<province>" <can> be a route stop

    Examples:
      | province | size        | market                  | can    |
      | Lyon     | city        | without a market        | can    |
      | Troyes   | town        | with a weekly market    | can    |
      | Langres  | village     | without a market        | cannot |
      | Elmina   | hamlet      | with a trading post     | can    |

  @TRADE-050
  Scenario Outline: A start and an end
    Given the trade config of the design
    When the player sets a route with <stops> stops
    Then the route is <result>

    Examples:
      | stops | result   |
      | 1     | refused  |
      | 2     | accepted |
      | 3     | refused  |

  @TRADE-050
  Scenario: The start and the end differ
    Given the trade config of the design
    When the player sets a route from "Troyes" to "Troyes"
    Then the route is refused

  @TRADE-051
  Scenario Outline: Route modes
    Given a caravan has the route "Troyes ▸ Geneva" in mode "<mode>"
    When it reaches "Geneva"
    Then it <next>

    Examples:
      | mode           | next                                     |
      | there and back | reverses toward "Troyes"                 |
      | once           | stops and waits for orders               |

  @TRADE-052 @placeholder
  Scenario: The planner prefers lower tolls when paths are close
    Given two paths from "Dijon" to "Geneva" take 15 and 16 days
    And the 15-day path has a toll and the 16-day path has none
    When the trade rules are applied
    Then the planner takes the 16-day path, a toll counting as 2 days

  @TRADE-052
  Scenario: The planner goes through the most populated land
    Given two paths from "Dijon" to "Geneva" take 15 and 18 days
    And the 15-day path runs through land of average people and the 18-day path through land with twice as many
    When the trade rules are applied
    Then the planner takes the 18-day path through the busier land

  @TRADE-053
  Scenario: Every province walked through gets busier and pays
    Given a caravan walks from "Lübeck" to "Bruges" along the coast road
    When the trade rules are applied
    Then every province on the coast road gets the ratio gain
    And the caravan collects in each of them

  @TRADE-054 @TRADE-055
  Scenario: The route preview
    Given the trade config of the design
    When the player sets the route "Troyes ▸ Geneva"
    Then the preview shows a loop of 38 days
    And it collects in 14 provinces a loop, best "Geneva", "Dijon", "Troyes"
    And it expects about 2.4 gold a month after fees and tolls
    And it shows the toll at the "Jura" pass of 0.2 a pass
    And it shows danger low with bandits near "Dijon"
    And it shows "Geneva: 6 of 8 visits taken this month"

  @TRADE-056 @TRADE-057 @TRADE-058 @TRADE-059
  Scenario Outline: When a route breaks
    Given a caravan has the route "Troyes ▸ Geneva"
    When <problem>
    Then the caravan <reaction>

    Examples:
      | problem                                                     | reaction                                                   |
      | the path from "Troyes" to "Geneva" closes and another exists | takes the other path as a dashed detour                    |
      | the path from "Troyes" to "Geneva" closes and none exists    | skips "Geneva"                                             |
      | "Geneva" is put under quarantine                            | skips "Geneva", which shows red; the turn report says so once |
      | every stop is closed                                        | goes to the nearest own city, deposits and waits for orders |

  @TRADE-121
  Scenario Outline: What a country can see of trade
    Given the province "<province>" is <how> "France"
    When "France" looks at its trade value and ratio
    Then "France" <sees> them

    Examples:
      | province | how                                              | sees        |
      | Troyes   | a province of                                    | sees        |
      | Geneva   | a province one of whose caravans entered, of     | sees        |
      | Milan    | a province no trader entered, far from           | doesn't see |
      | Milan    | a province known to T13, far from                | sees        |

  @TRADE-121 @TRADE-055
  Scenario: The preview counts provinces it cannot see as nothing
    Given a French caravan plans a loop through "Milan", which "France" cannot see
    When the player sets the route
    Then the preview expects nothing from "Milan"
