@context-world-map
Feature: Terrain tile types and grounds
  As the game
  I want 22 tile types drawn from real data, each playing as one of 11 grounds
  So that the map looks varied while the rules stay small

  @MAP-016 @MAP-017
  Scenario Outline: Each tile type plays as one ground
    Given the tile type "<type>" of the category "<category>"
    When its ground is looked up
    Then it plays as the ground "<ground>"

    Examples:
      | type          | category            | ground    |
      | grassland     | temperate           | grassland |
      | farmland      | temperate           | farmland  |
      | broadleaf     | temperate           | forest    |
      | mediterranean | temperate           | grassland |
      | paddies       | temperate           | farmland  |
      | forest        | boreal and polar    | forest    |
      | tundra        | boreal and polar    | tundra    |
      | glacier       | boreal and polar    | tundra    |
      | steppe        | dry lands           | grassland |
      | drylands      | dry lands           | drylands  |
      | desert        | dry lands           | desert    |
      | dunes         | dry lands           | desert    |
      | colddesert    | dry lands           | desert    |
      | savanna       | tropical            | savanna   |
      | jungle        | tropical            | jungle    |
      | marsh         | wetlands            | marsh     |
      | swamp         | wetlands            | marsh     |
      | hills         | hills and mountains | hills     |
      | mountains     | hills and mountains | mountains |
      | snowpeaks     | hills and mountains | mountains |
      | badlands      | hills and mountains | mountains |
      | highlands     | hills and mountains | mountains |

  @MAP-018 @MAP-019
  Scenario Outline: Mountain ranges take a type from the climate
    Given a Natural Earth mountain range in a "<climate>" climate
    When its pixels are typed
    Then the range is "<type>"
    And a rim of hills 1 to 3 pixels wide surrounds it

    Examples:
      | climate                          | type      |
      | desert                           | badlands  |
      | tropical                         | highlands |
      | alpine                           | snowpeaks |
      | temperate, north of 50 degrees   | snowpeaks |
      | temperate, south of 50 degrees   | mountains |

  @MAP-020
  Scenario Outline: Wetlands are swamp in the tropics and marsh elsewhere
    Given a Natural Earth wetland in "<place>"
    When its pixels are typed
    Then it is "<type>"

    Examples:
      | place          | type  |
      | the Sudd       | swamp |
      | the Pantanal   | swamp |
      | the Pripet     | marsh |
      | the Fens       | marsh |

  @MAP-021
  Scenario Outline: Fields are paddies in monsoon Asia and farmland elsewhere
    Given a crowded 1444 region in "<place>" whose wood is partly cleared for fields
    When its fields are typed
    Then they are "<type>"

    Examples:
      | place          | type     |
      | monsoon Asia   | paddies  |
      | the Paris basin | farmland |

  @MAP-022
  Scenario Outline: A province takes one ground by the province ground rule
    Given a province whose pixels are <mountain> % mountain, <hills> % hills and otherwise mostly "<common>"
    When its ground is decided
    Then its ground is "<ground>"

    Examples:
      | mountain | hills | common    | ground    |
      | 55       | 10    | grassland | mountains |
      | 20       | 10    | grassland | hills     |
      | 0        | 25    | farmland  | hills     |
      | 10       | 10    | grassland | grassland |

  @MAP-022
  Scenario: Thickly wooded temperate land is forest ground
    Given a temperate province over 60 % wooded after blurring
    When its ground is decided
    Then its ground is "forest"

  @MAP-023
  Scenario: Crowded grassland is farmland ground
    Given a grassland province in a part of 1444 crowded enough to be mostly under the plough
    When its ground is decided
    Then its ground is "farmland"

  @MAP-024
  Scenario: The Po valley is forced lowland
    Given the config lowland "Po valley"
    When the map is built
    Then the provinces of the Po valley are not hills or mountains

  @MAP-025
  Scenario: The simulation reads one ground per province
    Given a province drawn with broadleaf, farmland and grassland pixels
    When a system asks for its ground
    Then exactly one ground is returned

  @MAP-026 @MAP-045
  Scenario Outline: Ocean depth is stored in five bands
    Given a water pixel <depth> deep
    When the terrain image is written
    Then its green channel holds <value>

    Examples:
      | depth              | value |
      | less than 200 m    | 1     |
      | between 200 m and 1 km | 2 |
      | between 1 and 3 km | 3     |
      | between 3 and 5 km | 4     |
      | deeper than 5 km   | 5     |

  @MAP-045
  Scenario: Land pixels carry terrain in red and no depth
    Given a land pixel with no river
    When the terrain image is written
    Then its red channel holds its terrain type
    And its green channel holds 0

  @MAP-027
  Scenario Outline: Tile types suggest starting tile uses
    Given a province drawn mostly as "<type>"
    When its starting tiles are suggested
    Then they are "<tiles>"

    Examples:
      | type      | tiles                     |
      | farmland  | fields                    |
      | steppe    | pasture                   |
      | jungle    | woods                     |
      | badlands  | waste (mines)             |
      | paddies   | fields with rice paddies  |

  @MAP-028
  Scenario Outline: Adopted terrain proposals hold as map facts
    Given a province of the tile type "<type>"
    When movement reads it
    Then "<fact>" holds

    Examples:
      | type      | fact                                                           |
      | snowpeaks | without a pass or road it closes in winter                     |
      | dunes     | guns can't cross without camels and there is no foraging        |
      | glacier   | armies can't enter                                             |
      | paddies   | it is slower to cross in the wet season                        |

  @MAP-048
  Scenario Outline: Terrain proposals troop movement did not adopt are dropped
    Given the terrain proposal "<proposal>"
    When the map's facts are read
    Then the proposal changes nothing in the game

    Examples:
      | proposal                 |
      | broadleaf                |
      | mediterranean            |
      | steppe                   |
      | colddesert               |
      | swamp                    |
      | badlands                 |
      | highlands                |
      | snowpeaks cold sickness  |
      | glacier unsettleable     |
      | paddies horse            |
