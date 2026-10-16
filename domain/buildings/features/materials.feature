@context-buildings
Feature: Building materials
  As a realm
  I want materials taken from my own provinces first
  So that stone and timber are resources worth having

  @BLD-025 @BLD-026
  Scenario Outline: Where materials come from
    Given the province "Troyes" needs 30 stone for a site
    And <source_state>
    When the materials are sourced
    Then the stone comes from <source>

    Examples:
      | source_state                                                        | source                                   |
      | the province "Troyes" makes 40 stone a year                         | Troyes itself                            |
      | a realm province one ring away makes stone                          | that province, free                      |
      | a realm province three rings away along a road makes stone          | that province, along the road            |
      | no realm province in reach makes stone                              | the market, at the province's price      |

  @BLD-027 @placeholder
  Scenario Outline: Bought material prices
    Given no realm province in reach makes "<material>"
    When a site in "Troyes" buys 10 loads of "<material>"
    Then it pays <gold> gold

    Examples:
      | material | gold |
      | timber   | 5    |
      | stone    | 5    |
      | bricks   | 8    |
      | iron     | 20   |
      | steel    | 30   |
      | concrete | 30   |

  @BLD-028 @placeholder
  Scenario: Stone far from any quarry costs twice as much
    Given the province "Lyon" is more than 3 provinces from any quarry
    When a site in "Lyon" buys 10 loads of stone
    Then it pays 10 gold

  @BLD-029
  Scenario: Bricks stand in for stone
    Given the realm of "France" has no quarry and a brickworks in "Paris"
    When a stone castle needing 200 stone is built in "Reims"
    Then 200 bricks may be used instead, one for one

  @BLD-030
  Scenario Outline: Earth instead of stone in dry lands
    Given the province "<province>" has ground "<ground>"
    When a building needing stone is built there in earth
    Then the earth is free and made on site
    And the building's upkeep is doubled

    Examples:
      | province | ground   |
      | Djenné   | savanna  |
      | Timbuktu | desert   |
      | Kano     | drylands |

  @BLD-031
  Scenario Outline: Later materials by era
    Given the date is in era <era>
    When the building rules are applied
    Then "<material>" <available> as a building material

    Examples:
      | era | material | available |
      | III | iron     | is not    |
      | IV  | iron     | is        |
      | V   | steel    | is not    |
      | VI  | steel    | is        |
      | VI  | concrete | is        |

  @BLD-032 @open-question
  # OQ-BLD-2: trade v2 drops market price; what sets the bought price?
  Scenario: Few traders make bought materials dearer
    Given the province "Troyes" has few traders
    When a site there buys stone
    Then it pays more than the config price
