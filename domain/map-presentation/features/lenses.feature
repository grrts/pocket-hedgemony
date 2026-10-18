@context-map-presentation
Feature: Map modes
  As a player
  I want to recolour the map by one stat at a time
  So that I can see where food, faith, trade or trouble is

  @VIEW-021
  Scenario: Picking a lens recolours the map
    Given the lens "Realms" is on
    When the player picks "Food" from the map mode picker
    Then the map is recoloured by food
    And only one lens is on

  @VIEW-022
  Scenario Outline: The lens list holds every system's lens
    Given the map mode picker
    When the lenses are listed
    Then the lens "<lens>" is offered, from the context "<context>"

    Examples:
      | lens             | context     |
      | Food             | province    |
      | Tax reaching you | province    |
      | Days to capital  | province    |
      | Grievances       | province    |
      | Faith            | religion    |
      | Language         | culture     |
      | Ground           | province    |
      | Recruits         | province    |
      | Trade ratio      | trade       |
      | Trade value      | trade       |
      | Traders          | trade       |
      | Diplomacy        | diplomacy   |
      | Sea              | naval       |
      | Works            | buildings   |
      | Jobs             | buildings   |
      | Subjects         | subjects    |
      | Revolution       | revolutions |
      | Realms           | world-map   |
      | Terrain          | world-map   |
      | People           | province    |
      | Wealth           | province    |
      | Walls            | warfare     |

  @VIEW-022
  Scenario: The map mode picker holds 22 map modes and scrolls on a phone
    Given the map mode picker on a phone
    When the lenses are listed
    Then 22 lenses are offered
    And the picker scrolls
    And the lenses "Traders passing" and "Trade balance" are not offered

  @VIEW-023
  Scenario Outline: The Faith lens hatches large minority communities
    Given the Faith lens is on
    And the province "<province>" is <majority> with a <minority> community of <share> %
    When the map is drawn
    Then the province is coloured "<majority>" and <hatch>

    Examples:
      | province | majority  | minority | share | hatch          |
      | Rumelia  | Orthodox  | Sunni    | 35    | hatched        |
      | Aube     | Catholic  | Jewish   | 2     | not hatched    |

  @VIEW-024
  Scenario Outline: The Language lens changes with zoom and a toggle
    Given the Language lens is on
    And the realm toggle is <toggle>
    When the map is drawn at <zoom> zoom
    Then provinces are coloured by <colouring>

    Examples:
      | toggle | zoom   | colouring                         |
      | off    | World  | language family                   |
      | off    | Region | language                          |
      | on     | Region | same language, related or foreign |

  @VIEW-024
  Scenario: Homelands of peoples without a country are outlined
    Given the Language lens is on
    And the Basque have a homeland but no country
    When the map is drawn
    Then the Basque homeland is outlined

  @VIEW-025
  Scenario Outline: The Diplomacy lens colours countries by your relation
    Given the player is "Hungary" and the Diplomacy lens is on
    And the country "<country>" stands toward Hungary as <relation>
    When the map is drawn
    Then "<country>" is coloured <colour>

    Examples:
      | country      | relation                  | colour                    |
      | Wallachia    | your subject              | Hungary's own colour      |
      | Poland       | ally                      | blue                      |
      | Papal States | pledged                   | light blue                |
      | Venice       | Cool                      | grey                      |
      | Bohemia      | Rival                     | orange                    |
      | Ottomans     | at war                    | red, hatched              |

  @VIEW-025
  Scenario: A league against you shows as a red border
    Given the player is "Hungary" and the Diplomacy lens is on
    And a league has formed against Hungary
    When the map is drawn
    Then the league's members carry a red border

  @VIEW-026
  Scenario: The Sea lens shows sailors, fleets, winds and reachable zones
    Given the Sea lens is on
    When the map is drawn
    Then every port is shaded by sailors who can still be called
    And fleets at sea, the month's winds as arrows and the zones the fleet's ships can enter are shown

  @VIEW-027
  Scenario Outline: Trade lenses show ratio and your traders
    Given the lens "<lens>" is on
    When the map is drawn
    Then <shown>

    Examples:
      | lens        | shown                                                                 |
      | Trade ratio | provinces are coloured by trade ratio with the busiest roads and sea lanes as lines |
      | Traders     | only your traders and their routes are shown                          |

  @VIEW-028
  Scenario Outline: The Works and Jobs lenses colour building trouble and jobs
    Given the lens "<lens>" is on
    And a province <state>
    When the map is drawn
    Then the province is coloured <colour>

    Examples:
      | lens  | state                                   | colour                     |
      | Works | has a building site                     | green                      |
      | Works | has a neglected building                | amber                      |
      | Works | has a ruined building                   | red                        |
      | Jobs  | has empty job slots and homeless people | by slots against homeless  |

  @VIEW-029
  Scenario: The Subjects lens shows loyalty and courting
    Given the Subjects lens is on
    And a subject of the player is being courted by another country
    When the map is drawn
    Then each subject is coloured by its loyalty
    And a line runs from the courting country's capital to the courted subject

  @VIEW-030
  Scenario: The Revolution lens shows where the fire will start
    Given the Revolution lens is on
    When the map is drawn
    Then provinces are shaded by how many of the revolution's province signs they meet
    And risen provinces are hatched in the revolution's colour

  @VIEW-031
  Scenario: A hot ambition makes its region shimmer without naming the target
    Given a national ambition naming an area is hot
    When the map is drawn
    Then the area shimmers faintly
    And no target is outlined or named
