@context-achievements
Feature: When achievement tests run
  As the game
  I want each test to run only on its own moment and after the turn's systems
  So that a month's end runs a few dozen cheap comparisons that read final values

  @ACH-031
  Scenario: Only the rows for a moment are tested
    Given the moment "siege_end" occurs
    Then only the tests of "castle_by_terms", "castle_by_storm" and "castle_by_gold" run
    And the tests of rows for "turn_end" do not run

  @ACH-032 @ACH-088 @placeholder
  Scenario Outline: Date rows are checked once, on that day
    Given the date is <date>
    When the turn reaches that day
    Then the test of "<id>" runs once
    And it does not run again on a later day

    Examples:
      | date | id |
      | 1444-11-11 | reach_1444 |
      | 1500-01-01 | reach_1500 |
      | 1405-12-31 | ankara_weathered |
      | 1460-12-31 | walls_held_1453 |
      | 1914-01-01 | never_colonised |

  @ACH-088
  Scenario Outline: A day on or before the campaign's start is never reached
    Given the campaign started on <start>
    And the date is 1444-11-11
    When the turn reaches that day
    Then the achievement "reach_1444" <result>

    Examples:
      | start | result |
      | 1378-09-20 | unlocks |
      | 1444-11-11 | stays locked |

  @ACH-033
  Scenario: Tests read the turn's final values
    Given the country has 9990 gold before the month
    And the month's income brings the treasury to 10010 gold
    When the turn's own systems have all run
    Then the "turn_end" tests run last
    And the achievement "treasury_10000" unlocks
