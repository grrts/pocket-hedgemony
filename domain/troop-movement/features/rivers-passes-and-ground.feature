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

  # OQ-MOVE-10: hemisphere of the summer and autumn rule
  @MOVE-027 @open-question
  Scenario Outline: A ford counts as a bridge in summer and autumn
    Given the river province "Tortosa" (not a great river) has the ford "Ebro at Tortosa"
    And the season is <season>
    When an army of 10000 men enters "Tortosa"
    Then the step gains <extra> days

    Examples:
      | season | extra |
      | summer | 0     |
      | autumn | 0     |
      | winter | 1     |

  # OQ-MOVE-10: which season a flood lasts
  @MOVE-028 @open-question
  Scenario: A flood doubles river days
    Given a flood is on the river province "Troyes"
    When an army of 10000 men enters "Troyes"
    Then the step gains 2 days

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

  @MOVE-034 @open-question
  # OQ-MOVE-11: dunes are a tile type, steps use province ground
  Scenario: Dunes
    Given an army with guns and no camels
    When it plans a step into dunes
    Then the step is not allowed for its guns
    And dunes count 3 crossings instead of 2
    And the army can't forage there

  # config: ferryDaysPer10kMen; OQ-MOVE-20
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
