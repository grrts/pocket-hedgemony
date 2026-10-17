@context-achievements
Feature: Campaign and lifetime scope, and progress bars
  As a player
  I want progress towards long goals shown in the game and in each store
  So that I can see how close I am

  @ACH-027
  Scenario: A campaign achievement must be met inside one game
    Given the player held 6000 gold in an earlier campaign
    And the player holds 5000 gold in this campaign
    When the moment "turn_end" occurs
    Then the achievement "treasury_10000" stays locked

  @ACH-028
  Scenario: A lifetime achievement adds up across games
    Given the profile counts 49 distinct non-historical event options picked
    When the player picks a non-historical event option never picked before in a new eligible campaign
    Then the lifetime counter "distinct_nonhistorical_options" reaches 50
    And the achievement "paths_not_taken" unlocks
    And the counter is mirrored to the store's progress

  @ACH-044 @ACH-046 @placeholder
  Scenario: Game Center shows percent complete
    Given the achievement "scholars_100" has the progress target 100
    When the country has 40 scholars at work
    Then Game Center is told the achievement is 40 percent complete

  @ACH-044 @ACH-045 @placeholder
  Scenario Outline: Google Play counts large targets in steps
    Given the achievement "<id>" has the progress target <target>
    When the counter "<stat>" is <value>
    Then Google Play is told <steps> steps

    Examples:
      | id | target | stat | value | steps |
      | people_10m | 10000000 | people | 2500000 | 250 |
      | scholars_100 | 100 | scholars | 40 | 40 |

  @ACH-044 @ACH-047 @placeholder
  Scenario Outline: Steam shows a progress popup at set steps
    Given the achievement "quiet_land" has the progress target 300
    When the counter "months_no_unrest_tier" reaches <value>
    Then Steam shows a progress popup at <percent> percent

    Examples:
      | value | percent |
      | 75 | 25 |
      | 150 | 50 |
      | 225 | 75 |

  @ACH-048 @ACH-049 @ACH-050 @placeholder
  Scenario: Campaign progress is reported only when it beats the store's best
    Given the best value reported to the stores for "charters_in_force" is 4
    And a new campaign has begun, so the campaign counter "charters_in_force" starts at 0
    When the player grants charters until 3 are in force
    Then the in-game list shows 3 of 5
    And no progress is reported to any store
    When the player grants charters until 5 are in force
    Then the stores are told 5 of 5
