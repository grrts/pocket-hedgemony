@context-world-map
Feature: Sea zones and straits
  As the game
  I want water split into zones that measure travel time
  So that fleets and voyages count days the same way at every latitude

  @MAP-010
  Scenario Outline: Sea zones are sized in kilometres
    Given a sea zone of kind "<kind>"
    When its size is measured
    Then it is about <km> km across at any latitude

    Examples:
      | kind  | km  |
      | sea   | 150 |
      | ocean | 300 |

  @MAP-011 @MAP-012
  Scenario: Sea zones follow the land provinces and take marine names
    Given the built map
    When the places are listed in order
    Then all land provinces come before all sea zones
    And every sea zone has terrain "sea" or "ocean"
    And every sea zone is named from Natural Earth's marine areas

  @MAP-013
  Scenario Outline: Named straits join seas the grid closes
    Given the strait "<strait>" in the map config
    When the map is built
    Then the sea zones on either side of "<strait>" are neighbours

    Examples:
      | strait               |
      | Bosporus             |
      | Dardanelles          |
      | Kerch Strait         |
      | Oresund              |
      | Great Belt           |
      | Strait of Gibraltar  |
      | Strait of Messina    |
      | Strait of Hormuz     |
      | Bab-el-Mandeb        |
      | Strait of Malacca    |
      | Garabogaz strait     |
      | Strait of Maracaibo  |

  @MAP-014 @open-question
  # OQ-MAP-3: the land list of strait crossings is not in the data
  Scenario Outline: Land neighbours across a strait are listed for armies
    Given the strait crossing "<crossing>" in the movement config
    When the graph is read
    Then the two land provinces on either side of "<crossing>" are listed as a strait crossing

    Examples:
      | crossing  |
      | Bosporus  |
      | Oresund   |
      | Messina   |
      | Kerch     |
      | Gibraltar |

  @MAP-015
  Scenario: Armies can't walk into a sea zone
    Given an army stands in a coastal province
    When it is ordered to march into the neighbouring sea zone without ships
    Then the order is refused because armies need ships to cross water
