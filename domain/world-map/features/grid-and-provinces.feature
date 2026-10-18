@context-world-map
Feature: Map grid and provinces
  As the game
  I want one fixed world map cut into roughly even provinces
  So that every system counts days, tiles and people on the same places

  @MAP-001
  Scenario: The map grid covers the world at 16 pixels per degree
    Given the built map
    When its grid is read
    Then it is 5760 pixels wide and 2144 pixels high
    And it has 16 pixels per degree from latitude 78 north to 56 south

  @MAP-002 @MAP-003
  Scenario Outline: Province size targets differ by part of the world
    Given the config density region "<region>"
    When provinces are cut there
    Then admin regions are merged or split toward a target of <target> pixels

    Examples:
      | region                              | target |
      | Western and Central Europe          | 380    |
      | India                               | 420    |
      | China, Korea and Japan              | 450    |
      | Siberia and Central Asia steppe     | 1800   |
      | Sahara and Arabia deserts           | 2400   |
      | Far north                           | 3200   |
      | anywhere else                       | 1100   |

  @MAP-004
  Scenario Outline: A province is named after its modern admin region
    Given a province cut from the admin region "<admin region>" that was <split>
    When the map is built
    Then the province is named "<name>"

    Examples:
      | admin region           | split        | name                   |
      | Aube                   | not split    | Aube                   |
      | Northwest Territories  | split        | North Northwest Territories |

  @MAP-005
  Scenario: Lakes are punched out and islands become their own pieces
    Given an admin region with a large lake and an offshore island
    When the map is built
    Then the lake pixels belong to no province
    And the island is a piece of its own

  @MAP-006
  Scenario: The map has about 4,400 land provinces and 4,700 sea zones
    Given the built map
    When its places are counted
    Then there are 4411 land provinces
    And there are 4747 sea zones

  @MAP-007
  Scenario: A land province carries its geographic facts
    Given the province "Aube"
    When its record is read
    Then it has an id, a name, a centre, a size, a ground, a coastal flag, a river flag and a list of neighbours

  @MAP-046
  Scenario Outline: A province records its tile type
    Given the province "<province>"
    When its record is read
    Then its tile type is "<type>" and its ground is "<ground>"

    Examples:
      | province                      | type      | ground    |
      | Bozen                         | snowpeaks | mountains |
      | East Homs (Hims)              | dunes     | desert    |
      | North Qaasuitsup Kommunia     | glacier   | tundra    |
      | Northeast Henan               | paddies   | farmland  |
      | Aube                          | farmland  | farmland  |

  @MAP-047
  Scenario: A lake shore counts as water for shore tiles but has no sea zone
    Given the province "Tartu"
    When its record is read
    Then it is marked coastal
    And it counts as on water for shore tiles
    But it has no sea-zone neighbour

  @MAP-008 @placeholder
  Scenario Outline: A province's tiles follow its size on the map
    Given a province that is the <size> on the map
    When its tile row is made
    Then it has <tiles> tiles

    Examples:
      | size     | tiles |
      | smallest | 4     |
      | largest  | 16    |

  @MAP-009
  Scenario Outline: Only provinces on water have shore tiles
    Given a province that is <where>
    When its tile row is made
    Then it has <shore> shore tiles

    Examples:
      | where                         | shore     |
      | on a coast                    | 1 to 3    |
      | on a navigable river          | 1 to 3    |
      | inland with no navigable river | 0        |
