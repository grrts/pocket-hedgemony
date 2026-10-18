@context-buildings
Feature: Build sheet and building costs
  As a player
  I want to see what each building costs on this ground before I build
  So that I can choose what goes on each tile

  @BLD-018 @BLD-020 @placeholder
  Scenario: The build sheet in Troyes
    Given the province "Troyes" has 3600 homeless
    And fields tile 5 of "Troyes" is farmland worked bare by 3000 farmers
    When the player taps fields tile 5
    Then the build sheet lists:
      | building | jobs                       | cost                       |
      | farm     | 12,000 farmers             | 30 g · 10 timber · 6 mo    |
      | vineyard | 6,000 farmers              | 40 g · 10 timber · 12 mo   |
      | monastery| 300 clergy + 6,000 farmers | 90 g · 40 stone · 36 mo    |
      | castle   | garrison 2,000             | 300 g · 200 stone · 36 mo  |
    And the farm row says it makes grain for 22500
    And the sheet shows "Why here: 3,600 homeless in Troyes"

  @BLD-019
  Scenario: Missing needs show as a grey row
    Given the country "France" does not know "F5 Water and wind mills"
    When the player opens the upgrade list for a farm in "Troyes"
    Then the "mill farm" row is grey and says "needs Water and wind mills"

  @BLD-021 @BLD-022
  Scenario: Gold is paid up front by the owner
    Given the country "France" has 100 gold
    When the crown starts a "market" in "Troyes" costing 40 gold, 10 timber and 6 months
    Then the treasury of "France" has 60 gold at once
    And the site needs 10 timber, its crew and 6 months

  @BLD-023 @placeholder
  Scenario Outline: Ground multiplies gold and months but not materials
    Given a "stone castle" costs 300 gold, 200 stone and 36 months on farmland
    When it is built on "<ground>" ground
    Then it costs <gold> gold, 200 stone and <months> months

    Examples:
      | ground    | gold | months |
      | farmland  | 300  | 36     |
      | hills     | 375  | 45     |
      | mountains | 600  | 72     |
      | jungle    | 600  | 72     |

  @BLD-024 @placeholder
  Scenario: Cancelling a build
    Given the crown started a "stone castle" in "Reims" for 300 gold and 200 stone
    And 120 stone have been used
    When the player cancels the site
    Then 150 gold is refunded
    And 80 stone is returned
