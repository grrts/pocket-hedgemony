@context-troop-movement
Feature: Rivers, passes, seasons and ground
  As a player
  I want rivers, mountains and seasons to change how long a march takes
  So that bridges, passes and the calendar matter

  # config: riverDaysPer10kMen, greatRiverDaysPer10kMen
  @MOVE-024 @placeholder
  Scenario Outline: River days scale with the army
    Given an army of <men> men
    When it enters a <river> province with no bridge
    Then the step gains <extra> days

    Examples:
      | men   | river       | extra |
      | 10000 | river       | 1     |
      | 10000 | great river | 2     |
      | 14200 | river       | 2     |
      | 20000 | great river | 4     |
      | 25000 | river       | 3     |
      | 30000 | great river | 6     |
      | 40000 | river       | 4     |

  @MOVE-025
  Scenario: A bridge carries any army over
    Given an army of 40000 men
    When it enters a great river province with a bridge
    Then the step gains 0 days

  @MOVE-026
  Scenario: An enemy holding the bridge makes it useless
    Given an enemy army holds the bridge province "Troyes"
    When an army of 10000 men enters "Troyes"
    Then the step gains 1 day for the river

  # config: fordMonths (D-MOVE-10: summer and autumn of the ford's hemisphere)
  @MOVE-027 @placeholder
  Scenario Outline: A ford counts as a bridge in summer and autumn
    Given the river province "Tortosa" (not a great river) has the ford "Ebro at Tortosa" in the <hemisphere>
    And the month is <month>
    When an army of 10000 men enters "Tortosa"
    Then the step gains <extra> days

    Examples:
      | hemisphere | month   | extra |
      | north      | July    | 0     |
      | north      | October | 0     |
      | north      | January | 1     |
      | south      | January | 0     |
      | south      | July    | 1     |

  # config: frozenRivers (X-17: latitude 55° or more, December to March)
  @MOVE-117 @placeholder
  Scenario Outline: A frozen river is crossed like a bridge
    Given the river province "Narva" (not a great river) lies at latitude <latitude>
    And the month is <month>
    When an army of 10000 men enters "Narva"
    Then the step gains <extra> days

    Examples:
      | latitude | month    | extra |
      | 59       | January  | 0     |
      | 59       | December | 0     |
      | 59       | April    | 1     |
      | 50       | January  | 1     |

  # config: floodMonths 3 (D-MOVE-10)
  @MOVE-028 @placeholder
  Scenario Outline: A flood doubles river days for 3 months
    Given a flood starts on the river province "Troyes" in April
    And the month is <month>
    When an army of 10000 men enters "Troyes"
    Then the step gains <extra> days

    Examples:
      | month | extra |
      | April | 2     |
      | June  | 2     |
      | July  | 1     |

  # config: greatRiverScaleRanks (D-MOVE-10)
  @MOVE-024 @placeholder
  Scenario Outline: Great rivers by scale rank
    Given a river of Natural Earth scale rank <rank>
    Then it is <kind>

    Examples:
      | rank | kind          |
      | 0    | a great river |
      | 1    | a great river |
      | 2    | a river       |
      | 4    | a river       |

  @MOVE-029 @placeholder
  Scenario: A pass counts as a road
    Given the mountain province "Brenner" is a pass in config and has no road built
    When an army of 10000 foot steps from "mountains" into "Brenner"
    Then the road factor is 0.75

  @MOVE-030
  Scenario Outline: Snow peaks close in winter
    Given the snow-peak province "Peak" has no pass and no road and lies in the <hemisphere>
    And the month is <month>
    When the planner routes through "Peak"
    Then "Peak" is <state>

    Examples:
      | hemisphere | month     | state  |
      | north      | January   | closed |
      | north      | March     | closed |
      | north      | May       | open   |
      | south      | July      | closed |
      | south      | December  | open   |

  @MOVE-031
  Scenario Outline: Wet seasons by climate
    Given a province of climate "<climate>"
    And the month is <month>
    Then the province is <state> its wet season

    Examples:
      | climate       | month     | state  |
      | monsoon Asia  | July      | in     |
      | monsoon Asia  | January   | not in |
      | Sahel         | August    | in     |
      | savanna       | September | in     |
      | Amazon        | February  | in     |
      | Amazon        | July      | not in |

  @MOVE-032 @MOVE-033
  Scenario Outline: Ground an army can't enter on foot
    When an army tries to march into <place>
    Then it <result>

    Examples:
      | place              | result                  |
      | a sea zone         | needs ships             |
      | an ocean zone      | needs ships             |
      | a glacier          | can't enter             |

  @MOVE-034 @placeholder
  # config: dunesDaysToCross 3 (D-MOVE-11: dunes count when they are the province's main tile type)
  Scenario: Dunes
    Given the desert province "Erg" has dunes as its main tile type next to the desert province "Oasis"
    And an army of 10000 foot with 4 bombards and no camels stands in "Oasis"
    When it plans a step into "Erg"
    Then the step is not allowed for its guns
    And the same army without guns takes 15 days for the step
    And the same army with camels may take its guns into "Erg"
    And no army can forage in "Erg"

  # config: ferryDaysPer10kMen; a harbour on one side is enough (D-MOVE-20)
  @MOVE-035 @placeholder
  Scenario Outline: Crossing a strait by ferry
    Given "Thrace" and "Bithynia" are a strait crossing in config
    And a harbour on one side is owned by <owner>
    When an army of <men> men crosses the strait without its own ships
    Then the crossing <result>

    Examples:
      | owner                         | men   | result          |
      | the army's realm              | 10000 | takes 2 days    |
      | an ally                       | 15000 | takes 4 days    |
      | a realm that grants passage   | 30000 | takes 6 days    |
      | a neutral with no passage     | 10000 | is not possible |

  @MOVE-036
  Scenario: An enemy fleet closes a strait
    Given an enemy fleet enters the strait between "Thrace" and "Bithynia" on day 12
    When an army tries to cross by ferry on day 13
    Then the crossing is closed
