@context-world-map
Feature: Rivers, fords, passes and roads as geography
  As the game
  I want rivers, fords, passes and roads recorded on the map
  So that movement, trade and war can read them

  @MAP-029 @MAP-030
  Scenario Outline: Rivers are traced with their size
    Given a Natural Earth river of scale rank <rank>
    When it is traced onto the map
    Then its pixels have river size <size>
    And each pixel records which neighbours the river flows to

    Examples:
      | rank | size |
      | 0    | 2    |
      | 4    | 2    |
      | 5    | 1    |
      | 8    | 1    |

  @MAP-031
  Scenario Outline: A province with three or more river pixels is a river province
    Given a province with <pixels> river pixels
    When the map is built
    Then the province <is> a river province

    Examples:
      | pixels | is     |
      | 2      | is not |
      | 3      | is     |
      | 12     | is     |

  @MAP-032 @placeholder
  Scenario Outline: Named fords are listed
    Given the ford "<ford>" in the movement config
    When the graph is read
    Then the province of "<ford>" is listed as a ford

    Examples:
      | ford                  |
      | the Ebro at Tortosa   |
      | the Danube at Vidin   |

  @MAP-033 @placeholder
  Scenario Outline: Named passes are listed
    Given the pass "<pass>" in the movement config
    When the graph is read
    Then the province of "<pass>" is listed as a pass

    Examples:
      | pass                        |
      | the Great St Bernard        |
      | the Khyber                  |
      | the Brenner                 |
      | the Pyrenees at Roncesvalles |

  @MAP-034
  Scenario Outline: Each province has one road step
    Given the province "Troyes" has the road step "<road>"
    When movement reads its road
    Then the road step is "<road>" for the whole province

    Examples:
      | road        |
      | track       |
      | road        |
      | paved road  |
      | turnpike    |
      | railway     |

  @MAP-035
  Scenario Outline: A province records a navigable river
    Given the province "<province>"
    When its record is read
    Then it is a river province
    And it <does> show that a navigable river runs through

    Examples:
      | province | does     |
      | Aube     | does     |
      | Wien     | does     |
      | Loiret   | does not |

  @MAP-035
  Scenario: A navigable river is a great river for movement
    Given the province "Aube"
    When its record is read
    Then its river counts as a great river for movement

  @MAP-050 @placeholder
  Scenario Outline: Northern rivers freeze and are crossed like a bridge
    Given a river at latitude <latitude> with a crossing penalty of 1 day
    When it is <month>
    Then the river is <state> and its crossing penalty is <penalty> days

    Examples:
      | latitude | month    | state    | penalty |
      | 60       | January  | frozen   | 0       |
      | 55       | March    | frozen   | 0       |
      | 54       | January  | flowing  | 1       |
      | 60       | June     | flowing  | 1       |
