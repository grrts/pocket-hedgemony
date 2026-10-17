@context-recruiting
Feature: What a levy costs in food, harvest and births
  As a player
  I want to see the food and the lost harvest a levy costs
  So that I choose the season and size of a levy with open eyes

  # config: rations gathering / camp / campaign / home
  @RECR-031 @placeholder
  Scenario: Men and horses eat more in a training camp
    Given 2500 levies and 500 horses train at the castle of "Troyes"
    When a month of training passes
    Then the training eats 3750 rations for men and 1500 rations for horses
    And the rations come from the castle store of "Troyes" first, then the province "Troyes"

  @RECR-032 @placeholder
  Scenario Outline: Rations by where the men are
    Given 1000 men are <where>
    When a month passes
    Then they eat <rations> rations

    Examples:
      | where            | rations |
      | at home          | 1000    |
      | in training camp | 1500    |
      | on campaign      | 2000    |

  @RECR-033 @placeholder
  Scenario: The reserve is filled before marching abroad
    Given an army of 5000 men and 500 horses with a 2-month reserve
    When the reserve is filled
    Then the reserve takes 23000 rations
    And the rations come from the castle store first, then the locals

  # config: lost-harvest multiplier
  @RECR-034 @placeholder
  Scenario Outline: The season decides the lost harvest
    Given a levy takes 2 percent of the farmers of region "Champagne"
    And the season is <season>
    When the harvest is counted
    Then the harvest in "Champagne" falls by <loss> percent

    Examples:
      | season  | loss |
      | sowing  | 4    |
      | harvest | 6    |
      | winter  | 0    |

  # config: seasonMonthsByClimate.rice, pastoral.springMove (D-RECR-14)
  @RECR-035 @placeholder
  Scenario Outline: Rice lands have two harvests and two bad seasons
    Given a province with rice lands
    When a levy takes 2 percent of its farmers in month <month>
    Then its harvest falls by <loss> percent

    Examples:
      | month | loss |
      | 3     | 6    |
      | 5     | 4    |
      | 7     | 0    |
      | 9     | 6    |
      | 11    | 4    |

  @RECR-036 @placeholder
  Scenario Outline: Pastoral lands lose herd growth in the spring move
    Given a pastoral province in the <hemisphere>
    When a levy takes 2 percent of its herders in month <month>
    Then its herd growth falls by <loss> percent
    And its harvest does not fall

    Examples:
      | hemisphere | month | loss |
      | north      | 4     | 4    |
      | north      | 10    | 0    |
      | south      | 10    | 4    |

  @RECR-037 @RECR-038
  Scenario: The climate sets the sowing and harvest months
    Given the config gives each climate its sowing and harvest months
    When a levy is planned in a sowing or harvest month of its climate
    Then the levy screen shows a harvest warning

  @RECR-030
  Scenario: Births fall while men are away
    Given 10 percent of the fighting-age men of province "Troyes" are away with the army
    When the births of "Troyes" are counted
    Then births fall by the share of fighting-age men away
