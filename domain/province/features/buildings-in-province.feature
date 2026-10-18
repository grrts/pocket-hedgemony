@context-province
Feature: Buildings in the province
  As the game
  I want buildings to stand on tiles and employ one class each
  So that output follows the people who work there
  # The full building rules are owned by the buildings context; this is the province summary.

  @PROV-060
  Scenario: Every building stands on a tile and the castle is a building
    Given the province "Troyes" has a castle
    When the game works out the province's stats
    Then the castle stands on the castle tile of "Troyes"
    And it is counted among the province's buildings

  @PROV-061
  Scenario Outline: A building works in proportion to its filled slots
    Given the province "Troyes" has a farm with 12,000 job slots for farmers
    When the farm has <farmers> farmers
    Then the farm works at <share>
    And the farm is <fallow>

    Examples:
      | farmers | share | fallow     |
      | 12,000  | 100 % | not fallow |
      | 9,000   | 75 %  | not fallow |
      | 5,000   | 5/12  | fallow     |

  @PROV-062
  Scenario Outline: Ways to gain a building
    Given the province "Troyes" has no loom house
    When <way>
    Then the province "Troyes" has a loom house

    Examples:
      | way                                                                          |
      | the country "France" builds one, paying the cost times the ground's build cost |
      | the country "Burgundy" conquers the province with its loom house standing     |
      | an event founds one                                                          |
      | one appears by itself in a town with a market, homeless and wool nearby       |

  @PROV-063
  Scenario Outline: Ways to lose a building
    Given the province "Troyes" has a <building>
    When <cause>
    Then the <building> <result>

    Examples:
      | building   | cause                                       | result                    |
      | farm       | its tile burns                              | is lost                   |
      | market     | the town is sacked                          | is lost                   |
      | forge      | it stays neglected for 10 years             | falls one step            |
      | market     | the player demolishes it                    | is lost                   |
      | castle     | a peace treaty demolishes it                | is lost                   |
      | ranch      | its pasture tile is ploughed to fields      | is lost                   |

  @PROV-063
  Scenario: One unpaid month leaves a building neglected at half output
    Given the province "Troyes" has a forge
    When its upkeep goes unpaid for a month
    Then the forge is neglected and works at half

  @PROV-064 @placeholder
  Scenario Outline: Land buildings, their tiles and slots
    # config: province.buildings.slots
    Given the province "<province>" has a <tile> tile
    And the country knows "<unlock>"
    When a <building> is built there
    Then it has <slots> job slots for <class>

    Examples:
      | province | tile                       | unlock                          | building         | slots  | class     |
      | Troyes   | fields                     | known at start                  | farm             | 12,000 | farmers   |
      | Canton   | fields by a shore          | F2 Wet-rice terracing           | rice paddy       | 18,000 | farmers   |
      | Cusco    | fields on hills            | F2 Wet-rice terracing           | terrace          | 12,000 | farmers   |
      | Tenochtitlan | marsh                  | F6 Chinampa and raised fields   | raised fields    | 12,000 | farmers   |
      | Bahia    | fields on tropical ground  | F10 Sugar and spice plantations | plantation       | 12,000 | farmers   |
      | Troyes   | pasture                    | known at start                  | ranch            | 3,000  | herders   |
      | Andalusia | pasture                   | F11 Horse breeding studs        | horse stud       | 3,000  | herders   |
      | Troyes   | woods                      | known at start                  | lumber camp      | 1,500  | woodsmen  |
      | Potosí   | mountains with an ore deposit | known at start                  | mine             | 6,000  | miners    |
      | Herat    | waste                      | F3 Qanat and canal irrigation   | irrigation works | 1,500  | farmers   |
      | Lisboa   | shore                      | known at start                  | fishery          | 3,000  | seafolk   |
      | Cádiz    | shore on a warm coast      | known at start                  | saltworks        | 1,500  | miners    |
      | Lisboa   | shore                      | known at start                  | harbour          | 1,500  | seafolk   |
      | Lisboa   | shore with a harbour       | known at start                  | shipyard         | 3,000  | seafolk   |
      | Troyes   | shore on a river           | known at start                  | bridge           | 0      | nobody    |

  @PROV-064
  Scenario: A rice paddy needs water in the province
    Given the province "Canton" has no shore tile and no irrigation
    When a rice paddy is planned there
    Then the rice paddy is refused

  @PROV-064
  Scenario: A farm with a mill earns more gold from its grain
    Given the country "France" knows the invention "F5 Water and wind mills"
    When a mill is added to a farm in the province "Troyes"
    Then the farm earns +25 % gold from its grain

  @PROV-064
  Scenario: Castle steps come from research
    Given the country "France" knows the inventions "B4 Earthwork ring forts" and "B1 Stone castles"
    When the game works out the province's stats
    Then the country "France" may build an earthwork ring fort or a stone castle
    And it may build a bastion fort only with "B5 bastion_fortification" and a star fort only with "B6 Star forts"

  @PROV-065 @PROV-066
  Scenario: A mine runs out and leaves a ghost town
    Given the province "Potosí" has a silver mine with 1 year of ore left and 6,000 miners
    And every other slot in "Potosí" is full
    When the year of digging ends
    Then the mine has no ore left and closes
    And its miners become homeless
    And the town shrinks

  @PROV-065
  Scenario: Prospecting adds ore
    Given the province "Potosí" has a silver mine with 10 years of ore left
    When a prospecting event adds 5 years of ore
    Then the mine has 15 years of ore left

  @PROV-067
  Scenario Outline: Shipyards and mines need timber in reach
    Given the province "Lisboa" has a shipyard
    And <timber>
    When the game works out the province's stats
    Then ships <result> be built in "Lisboa"

    Examples:
      | timber                                                         | result |
      | the province "Lisboa" has a lumber camp                        | can    |
      | a neighbouring province has a lumber camp                      | can    |
      | the nearest lumber camp is two rings away and there is no road | cannot |

  @PROV-068 @placeholder
  Scenario: Bare tiles still give work
    # config: province.bare_tile.slots
    Given the province "Troyes" has a woods tile with no building
    When the game works out the province's stats
    Then up to 3,000 woodsmen can work it at the ground's people output rate

  @PROV-069 @placeholder
  Scenario Outline: Town building slots come from town size
    # config: province.town.building_slots
    Given the town of "Troyes" is a <size>
    When the game works out the province's stats
    Then it has <slots> building slots

    Examples:
      | size        | slots |
      | hamlet      | 1     |
      | village     | 2     |
      | market town | 4     |
      | town        | 6     |
      | city        | 9     |
      | great city  | 12    |

  @PROV-070 @placeholder
  Scenario Outline: Town buildings and their workers
    Given the town of "Troyes" has a free building slot
    When a <building> is built there
    Then it has <slots> job slots for <class>
    And it needs <needs>

    Examples:
      | building                  | slots  | class       | needs                                  |
      | loom house                | 1,500  | craftsmen   | a raw ware such as wool                |
      | forge                     | 1,500  | craftsmen   | iron                                   |
      | kiln                      | 1,500  | craftsmen   | clay                                   |
      | tannery                   | 1,500  | craftsmen   | hides                                  |
      | press                     | 900    | craftsmen   | paper and printing                     |
      | brewery or winery         | 900    | craftsmen   | grain or grapes                        |
      | market                    | 1,500  | market folk | a market charter for the fair          |
      | caravanserai or warehouse | 900    | market folk | a road                                 |
      | house of worship          | 600    | clergy      | nothing                                |
      | seat                      | 300    | clerks      | a town or bigger, and its own official |
      | almshouse                 | 600    | clergy      | gold upkeep                            |
      | powder mill               | 900    | craftsmen   | saltpetre                              |
      | hospital, wells and drains | 600   | clergy      | later inventions                       |
      | factory                   | 6,000  | craftsmen   | era V inventions and coal or water power |
      | rail station              | 600    | craftsmen   | the railway invention and a road       |

  @PROV-070
  Scenario: A school needs a market town or bigger
    Given the town of "Troyes" is a village
    When a school is planned there
    Then the school is refused

  @PROV-071 @placeholder
  Scenario: An almshouse shelters the homeless
    # config: province.almshouse.shelters
    Given the province "Troyes" has 4,000 homeless
    When an almshouse is built in "Troyes"
    Then 3,000 homeless are sheltered
    And only 1,000 homeless count toward theft, the "Homeless" grievance and shanty camps

  @PROV-072
  Scenario: Craft buildings appear by themselves where trade is good
    Given the town of "Troyes" has a market, homeless people and wool nearby
    And a free building slot
    When the year passes
    Then a craft building may appear in "Troyes" by itself

  @PROV-073
  Scenario: Fleeing craftsmen found a craft building
    Given craftsmen flee persecution in the country "Castile"
    When they arrive in the province "Antwerp"
    Then they may found a craft building in "Antwerp"
