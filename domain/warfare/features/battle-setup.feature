@context-warfare
Feature: Battle: field, roles, levels, approaches and skills
  As a player
  I want a battle fought on the province's own tile row and decided by what I chose before it
  So that the commander, the troop types and levels, the inventions and the place decide the battle

  # Config keys: warfare.battle.bells_per_day, warfare.battle.max_days, warfare.battle.max_sectors,
  # warfare.sectors, warfare.approaches, warfare.levels_by_era, warfare.might_by_era, warfare.cunning_by_era,
  # warfare.logistics_by_era, warfare.tired_after_bells, warfare.tired_penalty

  @WAR-089
  Scenario Outline: Two hostile armies in one province fight unless one slips away
    Given the army of "Burgundy" with commander Cunning <burgundy> stands in "Troyes"
    And the army of "France" with commander Cunning <france> arrives in "Troyes" at the end of a day
    And the army of "Burgundy" wants to withdraw and is <trapped>
    When the battle is resolved
    Then <result>

    Examples:
      | burgundy | france | trapped     | result                                  |
      | 4        | 2      | not trapped | the army of "Burgundy" slips away       |
      | 2        | 4      | not trapped | the two armies fight                    |
      | 4        | 2      | trapped     | the two armies fight                    |
      | 3        | 3      | not trapped | the two armies fight                    |

  @WAR-090 @placeholder
  Scenario: A battle day has 6 bells and a battle at most 3 days
    Given a battle in era II
    When the battle is resolved
    Then each battle day has 6 bells
    And if no army has broken after 3 days the attacker pulls back

  @WAR-091 @WAR-093
  Scenario: The battlefield is the province's middle tiles: Troyes 1450
    Given the province "Troyes" has a tile row whose middle 7 tiles are Fields, Fields, Fields, Pasture, Pasture, Woods, Town
    When a battle is fought in "Troyes"
    Then the battlefield has 7 sectors: Fields, Fields, Fields, Pasture, Pasture, Woods, Town
    And each army has its camp with its wagons, food reserve, wounded and unplaced guns behind it

  @WAR-091
  Scenario: A province with fewer tiles uses all of them
    Given a province with a tile row of 4 tiles
    When a battle is fought there
    Then the battlefield has 4 sectors

  @WAR-091 @placeholder
  Scenario Outline: Sector room and effects
    Given a sector of tile use "<tile>"
    When the battle is resolved
    Then its room is <room>
    And <effect>

    Examples:
      | tile    | room  | effect                                                                    |
      | fields  | 3000  | horse can charge in it                                                    |
      | pasture | 3000  | horse can charge in it and horse gets +10 %                               |
      | woods   | 1000  | no charges are possible and shooting into it is halved                    |
      | marsh   | 500   | no charges are possible and everyone fights at -25 %                      |
      | shore   | 1000  | attacking across it is -25 % unless the province has a bridge              |
      | town    | 1500  | the defender gets +50 %, shooting into it is halved and no charges        |

  @WAR-091
  Scenario Outline: Waste is open or rough by ground
    Given a sector of tile use "waste" in a province of ground "<ground>"
    When the battle is resolved
    Then charges <charges> in it

    Examples:
      | ground    | charges          |
      | drylands  | are possible     |
      | desert    | are possible     |
      | hills     | are not possible |
      | mountains | are not possible |

  @WAR-091
  Scenario: Fighting in the town burns town buildings
    Given companies fight in the town sector of "Troyes"
    When the battle is resolved
    Then town buildings of "Troyes" burn

  @WAR-092 @placeholder
  Scenario: The ground applies on top of the sectors
    Given a battle in a mountains province with a woods sector and a river bank
    When the battle is resolved
    Then the province's foot, horse and guns modifiers and its defender bonus apply
    And a defending army of the province's homeland tongue gets +10 % in that rough country

  @WAR-093 @placeholder
  Scenario: Depth steps forward
    Given a fields sector with room 3000 holding 3000 men of an army with 2000 more men in depth behind it
    When 600 of the men in the sector are lost in a bell
    Then at the end of the bell 600 men step forward from depth

  @WAR-093
  Scenario: A narrow field favours the small army
    Given an army of 30000 and an army of 8000 meet on a row of woods and marsh sectors
    When the battle is resolved
    Then the bigger army's extra men only stand as fresh depth

  @WAR-094
  Scenario: No dice and no orders from the player during battle
    Given the same two armies, commanders, tile row and inventions
    When the battle is fought twice
    Then both battles have the same result

  @WAR-095 @placeholder
  Scenario Outline: Roles
    Given a company with role "<role>" meets <enemy> in <sector>
    When the battle is resolved
    Then <result>

    Examples:
      | role  | enemy                       | sector       | result                                                     |
      | Brace | a Shock charge              | an open sector | the chargers take double hits and deal half              |
      | Brace | enemy Shot                  | an open sector | the Brace company takes x1.5 hits from shooting          |
      | Shock | a Line company              | an open sector | the Shock company deals double hits in the first bell it meets the enemy |
      | Shock | a Line company              | a woods sector | the Shock company cannot charge                          |
      | Heavy | enemy archers               | an open sector | arrows against it are halved                             |
      | Heavy | enemy hand gunners          | an open sector | hand gun hits against it are not halved                  |
      | Light | an enemy Line company       | an open sector | the Light company can step back a sector without fleeing and shoot again |
      | Guns  | enemy Line companies        | an open sector | the guns shoot into their own and the neighbouring sectors |

  @WAR-095
  Scenario: Shock charges again after a bell out of contact
    Given a Shock company in an open sector spent a bell out of contact
    When it meets an enemy again
    Then it deals double hits in that bell

  @WAR-095
  Scenario: Guns have no melee
    Given an enemy company reaches a sector held only by guns
    When the battle is resolved
    Then the guns deal no melee hits

  @WAR-096 @placeholder
  Scenario: Elephants panic
    Given a war elephant company in a sector holding 2000 men of its own side
    When that sector loses a bell badly
    Then the elephants trample their own side for 200 men

  @WAR-097 @placeholder
  Scenario Outline: Troop levels in battle (eras I and II)
    Given a company of level <level>
    When the battle is resolved
    Then its hits are <hits> and its break point bonus is <break>
    And <ability>

    Examples:
      | level | hits  | break | ability                                                   |
      | 1     | -10 % | 0 %   | it can't fall back without breaking                       |
      | 2     | 0 %   | 0 %   | it can fall back a sector on orders without breaking      |
      | 3     | +10 % | +5 %  | it can shift to a neighbouring sector within one bell     |
      | 4     | +20 % | +10 % | as Line it counts as half Brace                           |
      | 5     | +30 % | +15 % | it has one free order of its own each bell                |

  @WAR-098 @placeholder @open-question
  # OQ-WAR-9: era I thresholds in warfare-eras differ from the main table
  Scenario Outline: Reaching a level (main table)
    Given a company with drill <drill> and scars <scars>
    When the battle is resolved
    Then its level is <level>

    Examples:
      | drill | scars | level |
      | 0     | 0     | 1     |
      | 3     | 0     | 2     |
      | 6     | 1     | 3     |
      | 6     | 3     | 4     |
      | 12    | 5     | 5     |

  @WAR-099
  Scenario: A standing regiment never drops below level 2
    Given a standing regiment of level 2 in a realm that knows "W12 Standing regiments"
    When it is refilled with many new men
    Then its level is 2

  @WAR-099
  Scenario Outline: Losing levels
    Given a company of level 3
    When <event>
    Then its level can fall

    Examples:
      | event                                   |
      | new men dilute its drill and scars      |
      | 5 years pass without a battle           |
      | it is hungry                            |

  @WAR-100
  Scenario Outline: The approach behind each style sets deployment
    Given a commander whose style uses the approach "<approach>"
    When he deploys
    Then <deployment>

    Examples:
      | approach     | deployment                                                                  |
      | Breakthrough | all Shock is massed in the best one or two open sectors with a small reserve |
      | Steadfast    | Line stands evenly in every sector with Shot behind and a quarter in reserve |
      | Envelopment  | the end sectors are strong and the centre is thin and Drilled              |
      | Skirmish     | Light and Shot spread over the open sectors with Shock behind and no reserve |
      | Ambush       | up to half the army hides in woods, marsh and town sectors                  |
      | Bombardment  | guns are massed in the centre sectors with Line guarding them               |
      | Assault      | everyone stands in front with no reserve                                    |

  @WAR-100
  Scenario: A style belongs to the commander, not to the battle
    Given the commander "Jean de Dunois" has the style "Three battles"
    When he leads in any battle
    Then he fights in the style "Three battles"

  @WAR-101 @WAR-102 @placeholder
  Scenario Outline: Entrenchment digs in only when attacked
    Given a commander whose style uses the approach "Entrenchment"
    When he is the <side>
    Then <result>

    Examples:
      | side     | result                                                                        |
      | defender | he spends the first bell digging in and dug-in sectors give the defender +50 % and reverse charges |
      | attacker | he fights as Steadfast                                                        |

  @WAR-103 @placeholder
  Scenario: Assault closes at once
    Given a commander whose style uses the approach "Assault"
    When the first bell is fought
    Then everything advances with no shooting phase for either side
    And losses are x1.25 for both sides

  @WAR-104 @placeholder
  Scenario: Might counts where the leader stands (eras III and IV)
    Given the date is 1650
    And a commander with Might 3 stands in a sector chosen by his approach
    When the battle is resolved
    Then the men in that sector get +15 % hits and +6 % break point
    And if that sector is lost he may be wounded, captured or killed

  @WAR-105 @placeholder
  Scenario Outline: Cunning gives orders and the more cunning acts second (eras III and IV)
    Given the date is 1650
    And a commander with Cunning <cunning>
    When the battle is resolved
    Then he has <orders> orders per bell

    Examples:
      | cunning | orders |
      | 0       | 1      |
      | 1       | 1      |
      | 2       | 2      |
      | 3       | 2      |
      | 4       | 3      |
      | 5       | 3      |

  @WAR-105
  Scenario: The more cunning commander answers moves
    Given the commander of "France" has Cunning 4 and the commander of "Burgundy" Cunning 2
    When a bell's orders are given
    Then "Burgundy" gives its orders first and "France" gives its orders after seeing them

  @WAR-106
  Scenario Outline: Spotting hidden companies
    Given an Ambush commander with Cunning <ambusher> hides companies in the woods
    And the enemy commander has Cunning <spotter>
    When the battle is resolved
    Then the hidden companies <seen>

    Examples:
      | ambusher | spotter | seen              |
      | 3        | 3       | are seen          |
      | 3        | 2       | are not seen      |

  @WAR-107 @placeholder
  Scenario Outline: Ammunition (eras III and IV)
    Given the date is 1650
    And a Shot company under a commander with Logistics <logistics>
    And its country <knows> "W10 Supply magazines"
    When the battle is resolved
    Then it can shoot for <bells> bells before falling back to the camp for a bell to refill

    Examples:
      | logistics | knows          | bells |
      | 0         | does not know  | 3     |
      | 2         | does not know  | 5     |
      | 2         | knows          | 6     |

  @WAR-108 @WAR-109 @placeholder
  Scenario: Rotation and tiredness
    Given a commander with Logistics 2
    And a company that has fought 3 bells in a row
    When it fights a 4th bell without being rotated
    Then its hits are -10 %
    And each bell up to 2 sectors may swap a tired company for a fresh one from depth for free

  @WAR-110 @placeholder
  Scenario Outline: The orders
    Given a company is given the order "<order>"
    When the battle is resolved
    Then <effect>

    Examples:
      | order          | effect                                                                                         |
      | Commit reserve | reserve companies enter a sector                                                               |
      | Shift          | a company moves to a neighbouring sector, arriving the same bell if Seasoned or better         |
      | Turn           | companies in a won sector strike a neighbour from the side with hits x1.5 and the enemy there -10 % break point |
      | Drive          | companies in a won sector take the enemy camp's wagons and food reserve, free prisoners, spike guns there and the enemy army is -10 % break point |
      | Fall back      | a company pulls back one sector's depth and takes no hits that bell                            |
      | Rally          | half of the men who fled from one sector this bell come back into line                         |
      | Spring         | hidden Ambush companies are revealed with hits x1.5 that bell and the enemy there -10 % break point |
      | Rotate         | a tired company is swapped for a fresh one beyond the free rotation                            |

  @WAR-110
  Scenario: A Raw company told to fall back breaks
    Given a company of level 1
    When it is given the order "Fall back"
    Then it breaks
