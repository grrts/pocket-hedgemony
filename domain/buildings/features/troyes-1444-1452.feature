@context-buildings
Feature: Troyes 1444 to 1452 worked example
  As a player of France
  I want building Troyes up to follow the design's worked example
  So that the rules hold together in one story

  Background:
    Given the date is 11 Nov 1444
    And the province "Troyes" has 12 tiles: 4 farms, a burned field, 2 ranches, a lumber camp, an empty woods tile, a fishery on the Seine, the castle and the town
    And the province "Troyes" has 3600 homeless
    And the town of "Troyes" is a town with 6 slots holding a market, 3 loom houses, a church and a school

  @BLD-155
  Scenario: Troyes in 1444
    Then the town of "Troyes" is a "town" with 6 town slots

  @BLD-062 @BLD-034 @BLD-037 @BLD-160 @placeholder
  Scenario: 1444, the burned field
    When the player pays 15 gold to rebuild the burned field
    Then the farm is rebuilt in 3 months instead of a year
    And 500 of the homeless form the crew
    And when it is done they move into the farm's slots

  @BLD-051 @BLD-025 @BLD-034 @BLD-158 @placeholder
  Scenario: 1445, the yearly fair
    Given the country "France" knows "T6 Merchant fairs and exchanges"
    And no free town slot is left in "Troyes"
    And a market charter is granted in "Troyes"
    When the player upgrades the market to a yearly fair for 100 gold, 30 stone and 12 months
    Then the stone comes free from a quarry in a lord's province one ring away, which counts as the crown's own
    And the crew of 2000 is all homeless
    And when the fair opens it takes 900 more market folk
    And traders can be hired in "Troyes"

  @BLD-009 @BLD-034 @placeholder
  Scenario: 1447, the town grows to a city
    Given the date is 1447
    When the town of "Troyes" grows to a city with 9 slots
    And the player builds a drill yard for 40 gold, a warehouse for 30 gold and a fourth loom house for 35 gold
    Then each crew takes the homeless first
    And "Troyes" ends with 400 homeless, under 1 %, and no theft

  @BLD-073 @BLD-026 @placeholder
  Scenario: 1449, the woods tile is kept
    Given the date is 1449
    And the shipyard downriver needs the timber of "Troyes"
    When the player leaves the woods tile and builds a quarry on a hills tile of a neighbouring province for 20 gold
    Then the next castle step in "Troyes" needs no bought stone

  @BLD-043 @BLD-048 @BLD-064 @BLD-066
  Scenario: 1450, Burgundy invades
    Given the date is 1450
    And a stone castle upgrade site is running in "Troyes"
    When "Burgundy" invades and its foragers burn 2 fields
    And the town is besieged and takes honours of war
    Then the castle site stops
    And no town building burns because the town took terms instead of being plundered

  @BLD-063 @BLD-052 @placeholder
  Scenario: 1452, peace
    Given the date is 1452
    When peace is signed
    Then "Troyes" has 2 ruined farms rebuilding by themselves, one a year
    And its fair is intact and its castle site can restart
    And the upkeep of "Troyes" is 7 gold a year against 13 gold of tax reaching the crown
