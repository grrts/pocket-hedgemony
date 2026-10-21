@context-map-presentation
Feature: The living map close in
  As a player
  I want the map close in to show towns, armies and fleets as part of the world
  So that zooming in feels like looking at the land itself, not icons pasted on it

  @VIEW-100 @placeholder @open-question
  # OQ-VIEW-11: band thresholds
  Scenario Outline: Local zoom splits into three bands
    Given Map detail is "High"
    When the camera zoom is <zoom>
    Then the close-in band is "<band>"

    Examples:
      | zoom | band   |
      | 10   | icons  |
      | 16   | living |
      | 39   | living |
      | 40   | street |
      | 96   | street |

  @VIEW-101 @placeholder
  Scenario Outline: Icons cross-fade into living pieces
    Given Map detail is "High"
    When the camera zoom is <zoom>
    Then the icons are drawn at <icons> % and the living pieces at <living> %

    Examples:
      | zoom | icons | living |
      | 13   | 100   | 0      |
      | 15   | 50    | 50     |
      | 16   | 0     | 100    |

  @VIEW-102 @placeholder
  Scenario Outline: Pieces are drawn in the ground's art pixels
    Given Map detail is "High"
    When the camera zoom is <zoom>
    Then each art pixel of a piece is <u> CSS pixels

    Examples:
      | zoom | u |
      | 16   | 2 |
      | 32   | 4 |
      | 80   | 5 |

  @VIEW-103
  Scenario: Street level doubles the art density
    Given Map detail is "High"
    When the camera zoom is 40
    Then each map pixel is 16 art pixels across

  @VIEW-104 @placeholder @open-question
  # OQ-VIEW-13: street level on the phone default
  Scenario Outline: Map detail sets the close-in bands
    Given Map detail is "<detail>"
    When the camera zoom is 60
    Then the close-in band is "<band>"
    And the closest zoom is <closest>

    Examples:
      | detail | band   | closest |
      | Low    | icons  | 40      |
      | Medium | living | 40      |
      | High   | street | 96      |

  @VIEW-105 @placeholder @open-question
  # OQ-VIEW-12: footprint scale
  Scenario Outline: A town covers map pixels by the root of its people
    Given the town people number <town> thousand
    Then its town covers <cells> map pixels

    Examples:
      | town | cells |
      | 0.2  | 1     |
      | 16   | 6     |
      | 300  | 26    |
      | 5000 | 30    |

  @VIEW-105
  Scenario: Town people are the town classes
    Given the people number 10 thousand craftsmen, 4 thousand market folk, 1 thousand clergy, 1 thousand clerks, 0.5 thousand scholars and 90 thousand farmers
    Then it has 16.5 thousand town people

  @VIEW-106
  Scenario: Toledo grows from its seed over its own land
    Given the town of "Toledo" covers 15 map pixels
    Then the town starts at the province's land pixel nearest its centre point
    And every town pixel is land of "Toledo" within 8 pixels of the seed
    And every town pixel touches the town pixels before it

  @VIEW-106
  Scenario: A town whose centre point is in the sea is seeded on land
    Given the town of "Genova" covers 4 map pixels
    Then the town starts on land of "Genova"

  @VIEW-106
  Scenario: A growing town only adds pixels at its edge
    Given the town of "Toledo" covers 6 map pixels
    When the town grows to 15 map pixels
    Then its first 6 pixels are the same as before

  @VIEW-107 @placeholder
  Scenario: The first 60 % of a town is its core
    Given the town of "Toledo" covers 15 map pixels
    Then 9 of its pixels are core and 6 are outskirts

  @VIEW-108
  Scenario: Footprints change only in a new month and only where needed
    Given province 2 had 6 town pixels and province 1 had 4
    When a turn in the same month gives province 2 seven town pixels
    Then no footprint is worked out again
    When a turn in a new month gives province 2 seven town pixels
    Then only the footprint of province 2 is worked out again

  @VIEW-109
  Scenario: A capital's core holds its keep, market, house of worship and drill yard
    Given the town of "Sevilla" covers 12 map pixels
    And "Sevilla" is a realm's capital with a castle, a market and a drill yard on the coast
    Then its core holds a keep, a market square, a house of worship and a drill yard
    And the keep is the first core pixel that is not the docks

  @VIEW-109
  Scenario: A village always has its house of worship
    Given the town of "Sevilla" covers 1 map pixels
    Then its only special cell is a house of worship

  @VIEW-110
  Scenario Outline: Walls by castle step
    Given the town of "Toledo" covers 12 map pixels
    And "Toledo" has castle step <step>
    Then its walls are "<walls>"

    Examples:
      | step | walls    |
      | 0    | none     |
      | 1    | palisade |
      | 2    | stone    |

  @VIEW-111 @placeholder
  Scenario Outline: The countryside makes hamlets
    Given the country people number <rural> thousand
    Then it has <hamlets> hamlets

    Examples:
      | rural | hamlets |
      | 10    | 0       |
      | 100   | 3       |
      | 900   | 6       |

  @VIEW-111
  Scenario: Hamlets stand apart from the town and each other
    Given the town of "Toledo" covers 10 map pixels
    When "Toledo" places 3 hamlets
    Then every hamlet is at least 4 pixels from the town and from the other hamlets

  @VIEW-112
  Scenario: A mine marks one pixel of the province
    When "Toledo" places a mine
    Then the mine stands on one pixel of "Toledo"

  @VIEW-113
  Scenario Outline: Roads are graded by both ends
    Given one town has road step <a> and its neighbour road step <b>
    Then the road between them is drawn as a "<grade>"

    Examples:
      | a | b | grade      |
      | 0 | 2 | track      |
      | 1 | 2 | road       |
      | 2 | 2 | paved road |

  @VIEW-113
  Scenario: Roads join neighbouring towns over land
    When roads are laid from "Toledo" to the towns of its neighbours
    Then every road runs over land from town to town in steps north, east, south or west

  @VIEW-113
  Scenario: A town between two others carries their road
    Given towns at "Toledo", "Madrid" and a town between them
    Then "Toledo" and "Madrid" keep no road of their own
    But with no town between them they keep one

  @VIEW-113
  Scenario: Roads keep near the straight line
    When a road is laid from "Toledo" to "Valencia"
    Then the road strays no more than 4 pixels from the straight line between the towns

  @VIEW-113
  Scenario: No road reaches an island
    When a road is laid from "Valencia" to "East Baleares"
    Then no road is found

  @VIEW-115
  Scenario: The settlement byte packs kind and road links
    Given the town of "Toledo" covers 9 map pixels
    And "Toledo" is a realm's capital
    And roads are laid from "Toledo" to the towns of its neighbours
    When the settlement bytes are packed
    Then the seed's byte is a "keep" with road links
    And the last town pixel's byte is "outskirts"

  @VIEW-116 @placeholder
  Scenario Outline: One figure per thousand men
    Given an army of <men> men
    When it is drawn in the "<band>" band
    Then it is <figures> figures

    Examples:
      | men   | band   | figures |
      | 400   | living | 1       |
      | 8000  | living | 8       |
      | 30000 | living | 12      |
      | 8000  | street | 32      |
      | 30000 | street | 40      |

  @VIEW-116
  Scenario: Figures are split by arm
    Given an army of 6000 foot, 3000 horse and 1000 guns with wagons
    When it is drawn as 10 figures
    Then it is 5 foot, 3 horse, 1 guns and 1 wagons figures

  @VIEW-117
  Scenario: A standing army stands in ranks
    Given an army of 12000 men standing
    When it is drawn in the "living" band
    Then its figures stand in 4 files

  @VIEW-118
  Scenario: A marching army walks in a column behind its banner
    Given an army of 5000 men marching east
    When it is drawn in the "living" band
    Then its leading figure carries the banner
    And the others follow behind it in one line

  @VIEW-119
  Scenario Outline: Figures fall with the men
    Given a side began a battle with 10000 men drawn in the "living" band
    When it has <men> men left
    Then it shows <figures> figures

    Examples:
      | men   | figures |
      | 10000 | 10      |
      | 4000  | 4       |
      | 100   | 1       |
      | 0     | 0       |

  @VIEW-120
  Scenario: Rebels carry no banner
    Given a rebel band of 3000 men standing
    When it is drawn in the "living" band
    Then none of its figures carries a banner

  @VIEW-121 @placeholder
  Scenario Outline: Fleets as hulls
    Given a fleet of <ships> ships
    When it is drawn in the "<band>" band
    Then it is <hulls> hulls

    Examples:
      | ships | band   | hulls |
      | 12    | living | 3     |
      | 80    | living | 8     |
      | 12    | street | 12    |

  @VIEW-122
  Scenario: Hulls in port fill the berths
    Given a fleet of 5 hulls is in a harbour with 3 berths
    Then 3 hulls lie at the berths and 2 wait off the docks

  @VIEW-123
  Scenario: A trader stands on its leg as an army steps
    Given a trader by land on a leg of 5 tiles
    When it has walked 0.6 of the way to the next province
    Then it stands 0.4 of the way from the 3rd tile to the 4th
    And a trader by river is drawn as a barge and one by sea as a trading ship

  @VIEW-132 @placeholder
  # livingMap.traders.maxTraders
  Scenario: The snapshot carries each trader where it walks
    Given a new game as "France"
    When the traders France may see are read
    Then each stands on a leg from the province it is in to the next of its loop, with the share walked
    And each leg enters a province whose trade France sees, over land along tiles from one centre to the next
    And France's own come first, at most 300

  @VIEW-125
  Scenario: A tap goes to the piece before the province
    Given an army stands in "Toledo" in the living band
    When the player taps just beside the army's figures
    Then the army's card opens
    When the player taps the far side of "Toledo"
    Then the province card of "Toledo" opens

  @VIEW-125
  Scenario Outline: Every piece has a 44-point tap box
    Given a piece is <w> by <h> art pixels at 2 CSS pixels each
    Then its tap box is <bw> by <bh> points

    Examples:
      | w  | h | bw | bh |
      | 10 | 6 | 44 | 44 |
      | 30 | 6 | 60 | 44 |

  @VIEW-126
  Scenario Outline: Markers bring back the plates
    Given the camera is in the "<band>" band
    And Markers is <markers> and the piece is <selected>
    Then its plate is <plate> and its name is <name>

    Examples:
      | band   | markers | selected     | plate | name  |
      | icons  | off     | not selected | shown | shown |
      | living | off     | not selected | hidden | hidden |
      | living | off     | selected     | shown | shown |
      | living | on      | not selected | shown | shown |
      | street | off     | not selected | hidden | shown |

  @VIEW-129
  Scenario Outline: Animations set which figures move
    Given Animations is "<animations>"
    Then a marching army <marching> and a standing army <standing>

    Examples:
      | animations | marching | standing  |
      | Full       | moves    | moves     |
      | Reduced    | moves    | stays still |
      | Off        | stays still | stays still |

  @VIEW-130 @placeholder
  Scenario: At most 60 figures move at once
    Given pieces of 30 figures near the centre, 40 figures further out and 20 figures furthest
    When the overlay is drawn
    Then the 30 nearest and the 20 furthest figures move and the other 40 stand still
