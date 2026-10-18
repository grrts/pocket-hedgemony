@context-balance
Feature: Balance checks
  As the game's developers
  I want each balance rule checked against a threshold
  So that an overpowered strategy or a war without a price shows up as a failure

  # Config keys: balance.checks.* (all provisional). A check warns within a fifth of its threshold.

  @BAL-013 @placeholder
  Scenario: No strategy dominates
    Given a run set over 6 probe realms and 8 seeds
    And the strategy "Conqueror" ranks first in 35 of the 48 pairs
    When the checks run
    Then the check "No strategy dominates" fails with 73 % against 60 %

  @BAL-014 @placeholder
  Scenario Outline: War is not the best path
    Given in the size band "medium" the Conqueror's mean score growth is <conqueror> and the best of Builder and Diplomat is <other>
    When the checks run
    Then the check "War is not the best path" gives <verdict>

    Examples:
      | conqueror | other | verdict |
      | 110       | 100   | pass    |
      | 122       | 100   | warn    |
      | 140       | 100   | fail    |

  @BAL-015 @placeholder
  Scenario: War is paid for
    Given in Conqueror runs war returns 9 points per 100 gold and works return 5
    When the checks run
    Then the check "War is paid for" fails with 80 % against 50 %

  @BAL-016 @placeholder
  Scenario: Conquest is answered
    Given 8 Conqueror runs in which Lands taken passed the era's league threshold
    And a league against the probe formed within 2 years in 3 of them
    When the checks run
    Then the check "Conquest is answered" fails with 38 % against 75 %

  @BAL-017 @placeholder
  Scenario: Wars end
    Given a run in which 20 wars lasted over a year
    And 1 of them ended by an obliged peace and 4 by the 60-month exhaustion peace
    When the checks run
    Then the check "Wars end" fails

  @BAL-018 @placeholder
  Scenario: No snowball
    Given the top size decile of 1444 grew its share of settled land 2 times as fast as the median realm
    When the checks run
    Then the check "No snowball" fails

  @BAL-019 @placeholder
  Scenario: Believable pace
    Given 400 realms were alive in 1444 and 150 are alive in 1544
    When the checks run
    Then the check "Believable pace" fails with 38 % against 50 % to 90 %

  @BAL-020 @placeholder
  Scenario: Small realms are playable
    Given the small band's best mean score growth is 60 and the large band's best is 100
    When the checks run
    Then the check "Every path is open to every size" fails with 60 % against 70 %

  @BAL-021 @placeholder
  Scenario: No collapse without cause
    Given 3 % of realm-runs went bankrupt at peace with no rebels
    When the checks run
    Then the check "No collapse without cause" passes
