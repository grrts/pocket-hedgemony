@context-province
Feature: Tiles and tile uses
  As the game
  I want every province to be a row of tiles with one use each
  So that land, its buildings and its changes can be counted and pointed at

  @PROV-010 @placeholder
  Scenario Outline: Tile count follows the province's size on the map
    # config: province.tiles.min, province.tiles.max
    Given the province "<province>" is the <size> province on the map
    When the province's tiles are laid out
    Then the province "<province>" has <tiles> tiles

    Examples:
      | province | size     | tiles |
      | Smallest | smallest | 4     |
      | Largest  | largest  | 16    |

  @PROV-294 @placeholder
  Scenario Outline: Tile count by size
    Given a map of 101 provinces ranked by land area
    When the province ranked <rank> lays out its tiles
    Then it has <tiles> tiles

    Examples:
      | rank | tiles |
      | 0    | 4     |
      | 50   | 10    |
      | 100  | 16    |

  @PROV-294 @placeholder
  Scenario Outline: Town size follows its townsfolk
    Given a town with <townsfolk> townsfolk
    Then the town is a "<size>" covering <tiles> town tiles

    Examples:
      | townsfolk | size        | tiles |
      | 600       | hamlet      | 1     |
      | 1,000     | village     | 1     |
      | 5,000     | market town | 1     |
      | 8,000     | town        | 1     |
      | 25,000    | city        | 1     |
      | 40,000    | great city  | 2     |
      | 100,000   | great city  | 3     |

  @PROV-011 @PROV-064
  Scenario Outline: Each tile has one use and holds only the buildings its use allows
    Given the province "Troyes" has a tile with use "<use>"
    When a "<building>" is placed on that tile
    Then the placement is <result>

    Examples:
      | use     | building      | result  |
      | Fields  | Farm          | allowed |
      | Pasture | Ranch         | allowed |
      | Woods   | Lumber camp   | allowed |
      | Marsh   | Raised fields | allowed |
      | Waste   | Mine          | allowed |
      | Shore   | Fishery       | allowed |
      | Castle  | Castle        | allowed |
      | Woods   | Farm          | refused |
      | Pasture | Mine          | refused |

  @PROV-012 @placeholder
  Scenario: Clearing woods gives fields after three years and one load of timber
    # config: province.clear_woods.years
    Given the province "Troyes" has an empty woods tile
    When the country "France" pays gold to clear that woods tile
    Then after 3 years the tile's use is "Fields"
    And the province "Troyes" gains 1 load of timber

  @PROV-013 @placeholder
  Scenario: Unworked fields grow back into woods
    # config: province.fields_to_woods.years
    Given the province "Troyes" has a fields tile nobody has worked for 10 years
    When the year ends
    Then the tile's use is "Woods"

  @PROV-014
  Scenario Outline: Salting or overgrazing turns land to waste
    Given the province "Troyes" has a <use> tile
    When the tile is <cause>
    Then the tile's use is "Waste"

    Examples:
      | use     | cause      |
      | fields  | salted     |
      | fields  | overgrazed |
      | pasture | overgrazed |

  @PROV-015
  Scenario: Fields turn to pasture after one season and pasture can be ploughed back
    Given the province "Troyes" has a fields tile
    When the country "France" turns that tile to pasture
    Then after one season the tile's use is "Pasture"
    When the country "France" ploughs that tile
    Then the tile's use is "Fields"

  @PROV-016
  Scenario Outline: Marsh comes and goes
    Given the province "Holland" has a <from> tile
    When <cause>
    Then the tile's use is "<to>"

    Examples:
      | from  | cause                                        | to     |
      | marsh | the country drains it with Polder drainage   | Fields |
      | fields | a flood strikes the tile                    | Marsh  |
      | fields | a dyke is broken in war                     | Marsh  |

  @PROV-017
  Scenario: Irrigation turns waste into fields
    Given the country "Timurids" knows the invention "F3 Qanat and canal irrigation"
    And the province "Herat" has a waste tile
    When the country "Timurids" irrigates that tile
    Then the tile's use is "Fields"

  @PROV-018 @placeholder
  Scenario Outline: Shore tiles exist only on water and are never lost
    # config: province.shore_tiles
    Given the province "<province>" <water>
    When the province's tiles are laid out
    Then the province "<province>" has <shore> shore tiles

    Examples:
      | province | water                         | shore      |
      | Troyes   | lies on a navigable river     | 1 to 3     |
      | Lisboa   | lies on a coast               | 1 to 3     |
      | Bohemia  | has no coast, lake or river   | 0          |

  @PROV-018
  Scenario: A blockade stops shore buildings working but keeps the tile
    Given the province "Lisboa" has a shore tile with a fishery
    When an enemy fleet blockades the province "Lisboa"
    Then the fishery stops working
    And the province "Lisboa" still has that shore tile

  @PROV-019 @PROV-020 @placeholder
  Scenario: The town grows over fields and shrinks back
    # config: province.town.second_tile_townsfolk
    Given the province "Troyes" has one Town tile and 39,000 townsfolk
    When its townsfolk reach 40,000
    Then the town takes a second tile built over fields
    When its townsfolk fall below 40,000
    Then the second town tile becomes fields again

  @PROV-019
  Scenario: A great city takes a third tile
    Given the province "Paris" is a great city
    When the game works out the province's stats
    Then the town of "Paris" covers 3 tiles

  @PROV-021
  Scenario Outline: A castle can stand on any land tile except the town
    Given the province "Troyes" has a <use> tile
    When the country "France" builds a castle on it
    Then the castle is <result>

    Examples:
      | use     | result                                     |
      | Fields  | built, and the tile stops producing        |
      | Pasture | built, and the tile stops producing        |
      | Town    | refused                                    |

  @PROV-022 @placeholder
  Scenario: A destroyed castle leaves waste, then fields
    # config: province.castle_ruin.waste_years
    Given the province "Troyes" has a castle
    When the castle is destroyed
    Then the castle tile is "Waste" for 5 years
    And after that the tile's use is "Fields"

  @PROV-023 @PROV-024
  Scenario Outline: Woods and pasture are lost
    # what a woods tile becomes after fire or overcutting is not stated in the design
    Given the province "<province>" has a <use> tile
    When <cause>
    Then the province "<province>" loses that <use> tile

    Examples:
      | province | use     | cause                                  |
      | Troyes   | woods   | fire burns the woods                   |
      | Troyes   | woods   | timber is cut faster than it regrows   |
      | Troyes   | woods   | the woods are cleared for fields       |
      | Kazan    | pasture | drought ruins the pasture              |
      | Kazan    | pasture | the pasture is ploughed to fields      |

  @PROV-023
  Scenario: Woods come back on unworked fields and by replanting
    Given the country "France" knows a later replanting invention
    When the country "France" replants a fields tile in the province "Troyes"
    Then the tile's use is "Woods"

  @PROV-024
  Scenario: Grassland provinces start with many pasture tiles
    Given the province "Crimea" has the ground "grassland"
    When the province's starting tile mix is set
    Then most of its land tiles are pasture
