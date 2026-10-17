@context-map-presentation
Feature: What each zoom shows
  As a player
  I want each zoom to show the things that matter at that scale
  So that the map stays readable from the whole world down to one province

  @VIEW-007
  Scenario Outline: World zoom shows owners and trouble icons
    Given the camera is at World zoom
    And the province "<province>" is <state>
    When the map is drawn
    Then the province shows its owner's colour
    And it shows <icon>

    Examples:
      | province | state            | icon                 |
      | Aube     | hungry           | the hunger icon      |
      | Rumelia  | rioting          | the riot icon        |
      | Brittany | in revolt        | the revolt icon      |
      | Paris    | at peace and fed | no icon              |

  @VIEW-008
  Scenario: World zoom shows armies as banners and arrows
    Given the camera is at World zoom
    And an army of 14,200 men is marching
    And a battle is being fought and a castle is besieged
    When the map is drawn
    Then the army shows a banner with "14,200" and an arrow thick by its men in its owner's colour
    And no day counts are shown
    And the battle shows crossed swords and the besieged castle a ring

  @VIEW-009
  Scenario: World zoom shows ports and fleets
    Given the camera is at World zoom
    And "Lisbon" is a great port and "Dartmouth" a small harbour
    When the map is drawn
    Then both show anchor dots in their owner's colour, the one at "Lisbon" larger
    And each fleet shows as a single ship sprite with a count

  @VIEW-010
  Scenario: World zoom shows the parchment, voyages and colonies being founded
    Given the camera is at World zoom
    And a caravel is on a voyage and a colony is being founded
    When the map is drawn
    Then the voyage path is a dotted line
    And the colony shows a small flag with a progress ring

  @VIEW-011
  Scenario: Region zoom shows towns, castles, roads and damage
    Given the camera is at Region zoom over "Troyes"
    When the map is drawn
    Then "Troyes" shows its town size, its castle with reach rings, its roads and rivers
    And the busiest trade paths are thicker with more traders
    And burned provinces are hatched and plague is shown

  @VIEW-012
  Scenario: Region zoom shows armies by arm with their food
    Given the camera is at Region zoom
    And the army of "Jean de Dunois" with foot, horse and 8 bombards is selected with 16 days of food
    And an enemy army is known only as a rumour
    When the map is drawn
    Then the army shows sprites for foot, horse and guns and a food bar of 16 days on its banner
    And its route shows day counts, month marks, food colour and step icons
    And the rumour shows as a faded banner

  @VIEW-012
  Scenario: Dragging an army shows the forage limit
    Given the camera is at Region zoom
    When the player drags an army over the province "Langres"
    Then the forage limit of "Langres" is shown

  @VIEW-013
  Scenario: Region zoom shows harbour berths and slipways
    Given the camera is at Region zoom over "Lagos"
    And its harbour has 7 of 20 berths used and its slipway has hulls building
    When the map is drawn
    Then the harbour tile shows an anchor icon with "7/20"
    And the slipway icon shows the hulls building
    And each fleet shows its admiral's banner and a course line in days

  @VIEW-014
  Scenario: Region zoom shows houses of worship, preachers and waves
    Given the camera is at Region zoom over a province with a church and a mosque
    And a preacher is walking and a faith wave is active nearby
    When the map is drawn
    Then the church shows a spire sprite and the mosque a dome sprite in the town
    And the preacher shows as a walking figure
    And the wave shows as a soft tint spreading from its source

  @VIEW-015
  Scenario Outline: Envoys and war aims show only from Region zoom
    Given the Diplomacy lens is on
    And an envoy of "Hungary" is on the road and "Hungary" holds a war aim against the "Ottomans"
    When the map is drawn at <zoom> zoom
    Then <shown>

    Examples:
      | zoom   | shown                                                                 |
      | World  | only the diplomacy colours show                                       |
      | Region | the envoy rides with a dotted route and the Ottomans carry the war-aim icon |

  @VIEW-016
  Scenario: Region zoom shows traders and market cities
    Given the camera is at Region zoom over "Venice"
    And a galley trader with half its purse is sailing
    When the map is drawn
    Then the trader shows as a ship icon with a purse bar at half
    And "Venice" shows a coin for its market

  @VIEW-017
  Scenario: Region zoom shows colonial range and colonisable provinces
    Given the country "Castile" has a colonial range of 20 zones
    And the camera is at Region zoom over the Canaries
    When the map is drawn
    Then the colonial range shows as a faint line on the sea
    And provinces Castile can colonise show a pale flag

  @VIEW-018
  Scenario: Local zoom shows the tile row as pixel art
    Given the camera is at Local zoom over "Troyes"
    When the map is drawn
    Then each tile shows its building as a sprite
    And the burned field is in ash
    And workers move on busy tiles, ships sit in the harbour and caravans walk the road

  @VIEW-018
  Scenario: Local zoom shows marching columns in proportion
    Given the camera is at Local zoom
    And an army of 10,000 foot and 2,000 horse with wagons is marching on the road
    When the map is drawn
    Then the army shows as columns of foot, horse and wagons in proportion to its men

  @VIEW-019
  Scenario Outline: Battles and sieges are shown on the province's own tiles
    Given the camera is at Local zoom over "<province>"
    And <situation>
    When the map is drawn
    Then <shown>

    Examples:
      | province | situation                               | shown                                              |
      | Troyes   | a battle is being watched there         | the battle plays on the province's tile row        |
      | Langres  | its castle is besieged with one breach  | the castle tile shows its walls with one breach    |

  @VIEW-020
  Scenario: A new system with no zoom table falls back to its lens and a Local card
    Given the system "Subjects" gives no zoom table, with the lens "Subjects"
    When its map statement is built
    Then it shows the lens "Subjects" at World, Region and Local zoom
    And its card shows at Local zoom only

  @VIEW-070 @placeholder
  Scenario Outline: The camera zoom picks the zoom level
    Given the camera zoom is <camera>
    When the zoom level is worked out
    Then the zoom level is <level>

    Examples:
      | camera | level  |
      | 1      | World  |
      | 1.99   | World  |
      | 2      | Region |
      | 3.5    | Region |
      | 4      | Local  |
      | 8      | Local  |
