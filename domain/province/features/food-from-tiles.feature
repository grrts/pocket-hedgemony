@context-province
Feature: Food from tiles
  As the game
  I want each province's harvest to be the sum of its food tiles
  So that the food system gets its numbers from people, buildings, ground and weather

  @PROV-080 @PROV-081 @placeholder
  Scenario: Troyes feeds about 104,000 in a normal year
    # config: province.food.per_worker, province.ground.economy
    Given the province "Troyes" has the ground "farmland"
    And the province "Troyes" has 4 farms with 12,000 farmers each
    And the province "Troyes" has 2 ranches with 3,000 herders each
    And the province "Troyes" has 1 fishery with 3,000 seafolk
    And the province "Troyes" has 1 woods tile with no building worked by 3,000 woodsmen
    And the province "Troyes" has 1 burned fields tile
    When the harvest is "normal"
    Then the farms feed 90,000
    And the ranches feed 8,000
    And the fishery feeds 4,000
    And the bare woods tile feeds 2,000
    And the burned tile feeds nothing
    And the province "Troyes" feeds about 104,000 people a year

  @PROV-081 @placeholder
  Scenario Outline: People fed per worker by food tile
    Given a <tile> with 1,000 workers on "farmland" with a normal harvest
    When the game works out the province's stats
    Then it feeds <fed> people a year before the ground's multiplier

    Examples:
      | tile                         | fed            |
      | farm                         | 1,500          |
      | terrace                      | 1,500          |
      | raised fields                | 1,500          |
      | rice paddy                   | 1,500 per harvest, two harvests |
      | ranch                        | 1,330          |
      | fishery                      | 1,330          |
      | fields with no building      | 670 × people output |

  @PROV-082 @placeholder
  Scenario Outline: The harvest roll multiplies field food
    # config: province.harvest.multipliers
    Given a farm in the province "Troyes" that feeds 18,000 in a normal year
    When the harvest is "<roll>"
    Then the farm feeds <fed>

    Examples:
      | roll   | fed    |
      | bumper | 23,400 |
      | good   | 20,700 |
      | normal | 18,000 |
      | poor   | 12,600 |
      | failed | 5,400  |

  @PROV-082
  Scenario: Rice is rolled twice
    Given the province "Canton" has a rice paddy
    When the year's harvests are rolled
    Then the rice paddy's harvest is rolled twice

  @PROV-083
  Scenario Outline: Herds, fish, woods and pasture do not roll a harvest
    Given the province "Troyes" has a <tile>
    When the harvest is "failed"
    Then the <tile> feeds as in a normal year
    But <hazard> can still cut it

    Examples:
      | tile            | hazard                              |
      | ranch           | drought and hard winter events      |
      | fishery         | storms and blockades                |
      | bare woods tile | nothing named in the design         |
      | bare pasture    | nothing named in the design         |

  @PROV-084 @PROV-295
  Scenario Outline: Rotation inventions improve the harvest one step each
    Given the country "France" knows the invention "<invention>"
    When the province "Troyes" rolls a "poor" harvest
    Then the harvest counts as "normal"

    Examples:
      | invention                       |
      | F1 Three-field rotation         |
      | F12 Fodder crops (clover, turnips) |
      | F14 Seed drill                  |
      | F15 Four-field rotation         |

  @PROV-295
  Scenario Outline: Harvest steps add up and stop at bumper
    Given the province "Troyes" has <steps> harvest steps
    When the province "Troyes" rolls a "<roll>" harvest
    Then the harvest counts as "<counts>"

    Examples:
      | steps | roll   | counts |
      | 2     | failed | normal |
      | 3     | poor   | bumper |
      | 1     | bumper | bumper |

  @PROV-085
  Scenario: New crops turn a failed harvest into a poor one
    Given the country "Castile" knows the invention "F9 Maize, potato and cassava"
    When the province "Castile" rolls a "failed" harvest
    Then the harvest counts as "poor"
