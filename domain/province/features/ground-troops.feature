@context-province
Feature: Ground effects on troops
  As a player or AI country
  I want the ground of a province to change how armies fight, march, forage and sicken there
  So that choosing where to fight matters

  @PROV-040
  Scenario: Each province takes one ground from the map's terrain
    Given the map gives the province "Troyes" the terrain "farmland"
    When the province is set up
    Then the province "Troyes" has the ground "farmland"
    And its starting tile mix and its troop, building and people effects come from "farmland"

  @PROV-041 @placeholder
  Scenario Outline: The ground changes strength by arm and sets crossing, foraging and sickness
    # config: province.ground.troops
    Given a battle is fought in a province with the ground "<ground>"
    When the game works out the province's stats
    Then foot fight at <foot>, horse at <horse>, guns at <guns> and the defender at <defender>
    And the province takes <days> days to cross, with <foraging> foraging and <sickness> sickness

    Examples:
      | ground    | foot  | horse | guns  | defender | days | foraging    | sickness |
      | farmland  | 0     | +10 % | 0     | 0        | 1    | Rich        | Low      |
      | grassland | 0     | +25 % | 0     | −10 %    | 1    | Fair        | Low      |
      | savanna   | 0     | +15 % | 0     | 0        | 1    | Fair        | Medium   |
      | drylands  | 0     | +10 % | 0     | 0        | 1.5  | Poor        | Low      |
      | desert    | −10 % | −10 % | −10 % | +10 %    | 2    | Almost none | Heat     |
      | hills     | +10 % | −15 % | −10 % | +15 %    | 1.5  | Fair        | Low      |
      | mountains | 0     | −40 % | −30 % | +30 %    | 3    | Poor        | Cold     |
      | forest    | 0     | −25 % | −20 % | +15 %    | 2    | Fair        | Low      |
      | jungle    | −10 % | −40 % | −30 % | +25 %    | 3    | Poor        | High     |
      | marsh     | −10 % | −30 % | −30 % | +20 %    | 3    | Poor        | High     |
      | tundra    | 0     | −10 % | −10 % | +10 %    | 2    | Almost none | Cold     |

  @PROV-042 @placeholder
  Scenario: Camels do not suffer in the desert
    Given a battle is fought in a province with the ground "desert"
    When the game works out the province's stats
    Then horse fight at −10 %
    And camels fight at 0

  @PROV-043 @placeholder
  Scenario Outline: Attacking over a river
    # config: province.river_crossing_penalty
    Given the province "Troyes" has a river shore tile and <bridge>
    When an army attacks into "Troyes" over the river
    Then the attacker fights at <change>

    Examples:
      | bridge    | change |
      | no bridge | −20 %  |
      | a bridge  | 0      |

  @PROV-044 @placeholder
  Scenario Outline: Woods tiles give the defender an ambush bonus
    # config: province.woods_ambush
    Given a province has <woods> woods tiles
    When a battle is fought there
    Then the defender gets <bonus> from the woods

    Examples:
      | woods | bonus |
      | 1     | 0     |
      | 2     | +5 %  |
      | 4     | +10 % |
      | 6     | +15 % |
      | 8     | +15 % |

  @PROV-045 @PROV-049
  Scenario: Burned tiles give nothing to forage
    Given the province "Troyes" has 3 burned tiles of 12
    When an army forages in "Troyes"
    Then only the 9 unburned tiles count toward what it can take before it starts burning them

  @PROV-046
  Scenario: The defender fights from the walls of a castle tile
    Given the province "Troyes" has a castle tile
    When an enemy attacks the garrison of "Troyes"
    Then the defender fights from the walls under the warfare castle rules

  @PROV-047 @placeholder
  Scenario Outline: Locals know their rough land
    # config: province.locals_rough_bonus
    Given a defending army of the province's homeland tongue
    And the province has the ground "<ground>"
    When the game works out the province's stats
    Then the defender gets a further <bonus>

    Examples:
      | ground    | bonus |
      | hills     | +10 % |
      | mountains | +10 % |
      | forest    | +10 % |
      | jungle    | +10 % |
      | marsh     | +10 % |
      | farmland  | 0     |

  @PROV-048
  Scenario: Sickness hits soldiers not born on the ground hardest
    Given an army of men born in "Castile" stays a month in a province with the ground "jungle"
    And a local army stays a month in the same province
    When the month ends
    Then both armies lose men to "High" sickness
    And the army from "Castile" loses more
