@context-scenario-setup
Feature: Province starting values
  As the game
  I want every province's start set from the map, the catalogue and the other designs' 1444 data
  So that Troyes starts as a farmed market town and Lagos as a port

  @SETUP-028 @SETUP-038
  Scenario: The map sets tiles, ground, shore, people and starting buildings
    Given the province "Aube" on the map with its size, terrain, population, wealth and coast
    When the starting world is built
    Then its tile count follows its size and its ground its terrain
    And its tile mix follows its ground and its shore tiles its coast and rivers
    And its people follow its population and its starting buildings its wealth
    And its wealth is no longer a live stat once the buildings are placed

  @SETUP-029
  Scenario: The catalogue sets owner, lords' provinces, homeland and mixes
    Given the province "Côte-d'Or" whose catalogue owner is "burgundy"
    When the starting world is built
    Then its owner is Burgundy
    And its lord, Homeland of, Faith mix and Tongue mix follow the catalogue
    And whether it starts with an official follows Burgundy's administrative capacity

  @SETUP-030
  Scenario: Start inventions decide which buildings exist
    Given a country whose start inventions do not include stone castles
    When the starting world is built
    Then none of its provinces starts with a building step that needs that invention

  @SETUP-031
  Scenario: Region tables set wares, fever land and crops
    Given a jungle province in West Africa
    When the starting world is built
    Then its wares, fever land and crops come from the region table in config

  @SETUP-032
  Scenario Outline: Anchors fix named places
    Given the event-tree anchor "<anchor>"
    When the starting world is built
    Then the province of "<anchor>" starts with "<fixed>"

    Examples:
      | anchor         | fixed       |
      | Constantinople | its castle and market |
      | Malacca        | its market  |
      | Kutná Hora     | its mine    |

  @SETUP-033
  Scenario: Relations set trade pacts, occupations and pretenders
    Given the relations file records a 1444 claim of "Burgundy" on a French province
    When the starting world is built
    Then that province starts with Burgundy's duke as a pretender

  @SETUP-034 @SETUP-035
  Scenario Outline: Wealth and population set the first buildings and town
    Given a province with wealth <wealth> in "<region>"
    When the starting world is built
    Then <buildings>
    And its town slots fill by the "<template>" template

    Examples:
      | wealth | region         | buildings                                                      | template              |
      | 1      | Europe         | a third of its tiles have a farm or a ranch                    | European market town  |
      | 10     | Europe         | every tile is built and town buildings are at step 2           | European market town  |
      | 4      | the Sahel      | some tiles have buildings                                      | Sahel trade town      |

  @SETUP-036
  Scenario Outline: Ports start by their 1444 tier
    Given the 1444 port "<town>" of tier "<tier>"
    When the starting world is built
    Then its province starts with <harbour>

    Examples:
      | town      | tier          | harbour                                     |
      | Venice    | great port    | harbour 2                                   |
      | Bristol   | port          | harbour 2 or harbour 1 if the town is small |
      | Dartmouth | small harbour | harbour 1                                   |
      | Chetumal  | canoe landing | no harbour, extra seafolk and small craft   |

  @SETUP-037
  Scenario: The faith mix follows the owner, adjusted by region
    Given the province "Rumelia" owned by the record "ottoman"
    When the starting world is built
    Then its faith mix starts from the Ottoman record adjusted by the region table to an Orthodox majority

  @SETUP-039 @placeholder
  Scenario: The charted map starts six steps out
    Given the country "Castile"
    When the starting world is built
    Then Castile has charted every province within 6 steps of its lands
    And every sea zone touching them
