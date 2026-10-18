@context-balance
Feature: Balance report
  As Leroy, balancing the game
  I want the strategy comparison in the balance runs' report, with the tables behind it
  So that tuning starts from numbers and a failed check shows up as a finding

  # Builds on packages/sim (feedback 130, docs/balance-runs.md).

  @BAL-025
  Scenario: The report's files
    Given a strategy run set finished on 18 October 2026
    When the report is written
    Then its run folder holds "report.md", "summary.json", "metrics.csv" and "world.csv"
    And "report.md" has a strategy comparison with every check's verdict, value and threshold, the flagged levers and the three largest gaps between strategies
    And every failed check is a Balance finding

  @BAL-026
  Scenario: War-price checks come first
    Given the check "War is paid for" failed and a sweep flagged "warfare.occupation.tax_share" as sensitive
    When the report is written
    Then At a glance starts with the checks "War is not the best path", "War is paid for", "Conquest is answered" and "Wars end"
    And the failure of "War is paid for" names "warfare.occupation.tax_share" as the lever most likely to fix it

  @BAL-027
  Scenario: A failed check fails the command
    Given a full run set in which one check failed
    When the balance command ends
    Then it exits with a failure code

  @BAL-028
  Scenario: CI tests the tools without a campaign
    Given a pull request changes packages/sim
    When CI runs
    Then the strategies, checks and sweeps are tested on a few weeks of the small made-up world
    And no campaign on the real map is started

  @BAL-029
  Scenario: Runs start when Leroy asks
    Given Leroy asks in the project for a strategy run of 50 years
    When Claude runs it
    Then the run folder is copied to the project files under "balance-runs/<date>/"
    And "report.md" is linked in the thread
