@context-troop-movement
Feature: How fast an army goes
  As a player
  I want each step's days to come from things I can count
  So that I can see why an army is fast or slow

  # config: march.daysPerCrossing, march.daysToCross, march.horseSpeedBonus, gunsFactor, seasonFactor
  @MOVE-011 @MOVE-012 @MOVE-013 @MOVE-018 @MOVE-019 @MOVE-021 @MOVE-015 @placeholder
  Scenario Outline: Days for one step on normal march with no road and no commander
    Given an army of <army>
    And the season is <season>
    When it steps from "farmland" into "<ground>"
    Then the step takes <days> days

    Examples:
      | army                         | season | ground    | days  |
      | 10000 foot                   | summer | farmland  | 6     |
      | 10000 foot                   | summer | hills     | 7.5   |
      | 10000 foot                   | summer | forest    | 9     |
      | 10000 foot                   | summer | mountains | 12    |
      | 10000 men with 2000 horse    | summer | farmland  | 5.5   |
      | 10000 men with 2000 horse    | summer | hills     | 6.8   |
      | 10000 men with 2000 horse    | summer | forest    | 8.2   |
      | 10000 men with 2000 horse    | summer | mountains | 10.9  |
      | 3000 horse only              | summer | farmland  | 4     |
      | 3000 horse only              | summer | hills     | 5     |
      | 3000 horse only              | summer | forest    | 6     |
      | 3000 horse only              | summer | mountains | 8     |
      | 10000 foot with bombards     | winter | farmland  | 6     |
      | 10000 foot with bombards     | winter | hills     | 9.4   |
      | 10000 foot with bombards     | winter | forest    | 22.5  |

  @MOVE-019
  Scenario: Bombards can't enter mountains without a road
    Given an army of 10000 foot with bombards
    When it tries to step into "mountains" with no road
    Then the step is not allowed

  # config: roadFactor
  @MOVE-014 @placeholder
  Scenario Outline: The worse road of the two provinces counts
    Given the province "From" has a <road_from> and the province "To" has a <road_to>
    And both are farmland
    When an army of 10000 foot steps from "From" to "To"
    Then the step takes <days> days

    Examples:
      | road_from  | road_to    | days |
      | track      | track      | 6    |
      | road       | road       | 4.5  |
      | paved road | road       | 4.5  |
      | paved road | paved road | 3    |
      | turnpike   | turnpike   | 2.4  |
      | railway    | railway    | 0.6  |
      | railway    | track      | 6    |

  # config: orderFactor
  @MOVE-017 @placeholder
  Scenario Outline: The march order
    Given an army of <army>
    And its pace is "<order>"
    When it steps from "farmland" into "farmland"
    Then the step takes <days> days

    Examples:
      | army            | order   | days |
      | 10000 foot      | Normal  | 6    |
      | 10000 foot      | Forced  | 4.02 |
      | 10000 foot      | Careful | 7.98 |
      | 3000 horse only | Raid    | 2.68 |

  @MOVE-016 @placeholder
  Scenario: The wet season slows marsh, jungle and paddies
    Given the season is the wet season of the province's climate
    When an army of 10000 foot steps from "marsh" into "marsh"
    Then the step takes 22.5 days

  @MOVE-018 @placeholder
  Scenario Outline: Guns slow the whole army once
    Given an army of 10000 foot with <guns>
    When it steps from "farmland" into "hills"
    Then the step takes <days> days

    Examples:
      | guns                    | days  |
      | 1 bombard               | 9.375 |
      | 8 bombards              | 9.375 |
      | only light field guns   | 7.5   |

  @MOVE-020 @placeholder
  Scenario: The column strings out
    Given an army of 10000 foot
    And the province "To" is farmland with a forage limit of 8000
    When it steps from "farmland" into "To"
    Then the step takes 12 days

  # config: cunningSpeed
  @MOVE-022 @placeholder
  Scenario Outline: The commander's Cunning
    Given an army of 10000 foot led by a commander with Cunning <cunning>
    When it steps from "farmland" into "farmland"
    Then the step takes <days> days

    Examples:
      | cunning | days |
      | 0       | 6    |
      | 2       | 5.45 |
      | 4       | 5    |

  @MOVE-023
  Scenario: The engine keeps the fraction
    Given an army whose step takes 6.49 days
    Then the step is shown as 6 days
    And the engine counts 6.49 days
