@context-buildings
Feature: How buildings are damaged or lost
  As the game
  I want war, disaster, neglect and owners to damage or remove buildings
  So that every building lists how you lose it

  @BLD-064
  Scenario: Foraging armies burn land buildings
    Given a Burgundian army forages in "Troyes"
    When the building rules are applied
    Then land buildings in "Troyes" are burned tile by tile

  @BLD-065
  Scenario Outline: Raids
    Given the province "Troyes" <walls> town walls
    When a <size> raid hits "Troyes"
    Then <result>

    Examples:
      | walls | size  | result                                         |
      | has no| small | one building is damaged                        |
      | has no| big   | one building is ruined                         |
      | has   | small | one land building is damaged, no town building |

  @BLD-066 @placeholder
  Scenario Outline: Plundered towns
    Given the province "Troyes" has 12 town buildings and <walls>
    When "Troyes" is plundered
    Then <ruined> town buildings are ruined

    Examples:
      | walls              | ruined |
      | no town walls      | 4      |
      | stone town walls   | 2      |
      | a palisade         | 2      |

  @BLD-067
  Scenario: Rebels loot the market first
    Given rebels hold the province "Orléans"
    And "Orléans" has a market and a school
    When a season passes
    Then the market is looted

  @BLD-068
  Scenario: Town fire in a timber town
    Given the province "Troyes" is a town built mostly of timber
    When the yearly town fire roll succeeds
    Then one to three town buildings are damaged
    And a town of mostly stone or brick has fewer fires

  @BLD-069
  Scenario: Floods and broken dykes
    Given the province "Holland" is a marsh province with a fishery on a shore tile
    When a flood hits "Holland"
    Then the fishery is damaged
    And if a dyke is broken in war a fields tile turns to marsh

  @BLD-070 @placeholder
  Scenario: Earthquake
    Given the province "Lisbon" is in a quake region with 9 buildings and a stone castle
    When an earthquake event hits "Lisbon"
    Then 3 buildings are damaged
    And the castle falls a step

  @BLD-071
  Scenario: Demolishing returns a quarter of the materials
    Given the crown owns a forge in "Troyes" built with 20 timber
    When the crown demolishes the forge
    Then 5 timber come back
    And its craftsmen overflow

  @BLD-072
  Scenario: A peace treaty demands castles demolished
    Given "France" signs a peace with "Burgundy" demanding the castle of "Auxerre" demolished
    When the peace is signed
    Then the castle of "Auxerre" is demolished

  @BLD-073
  Scenario Outline: A tile changing use ends its building
    Given the province "Troyes" has a "<building>" on a <tile>
    When <change>
    Then the "<building>" ends

    Examples:
      | building     | tile       | change                         |
      | lumber camp  | woods tile | the woods tile is cleared      |
      | farm         | fields tile| the town grows over the fields |

  @BLD-074
  Scenario: A mine running out closes
    Given the province "Kutná Hora" has a silver mine
    When its ore deposit runs out
    Then the mine closes

  @BLD-161 @placeholder
  Scenario Outline: Town fires
    Given a town of size "<size>"
    Then its chance of a fire this year is <chance>

    Examples:
      | size        | chance |
      | market_town | 1 %    |
      | town        | 1 %    |
      | city        | 1.5 %  |
      | great_city  | 2 %    |

  @BLD-161 @placeholder
  Scenario Outline: Big raids
    Given a raid of <men> men
    Then the raid is <size>

    Examples:
      | men   | size  |
      | 1,999 | small |
      | 2,000 | big   |

  @BLD-160 @placeholder
  Scenario: Burned tiles rebuild
    Given the province "Troyes" has 2 burned farm tiles
    When a year of peace passes
    Then 1 farm rebuilds by itself for free
    And paying 15 gold rebuilds the other within 3 months
