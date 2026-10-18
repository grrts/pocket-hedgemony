@context-balance
Feature: Balance report
  As the game's developers
  I want one page that says whether the game is in balance, with the tables behind it
  So that tuning starts from numbers and a failed check can guard a merge

  # Config keys: balance.quick, balance.quick.minutes

  @BAL-025
  Scenario: The report's files
    Given a run set finished on 18 October 2026
    When the report is written
    Then its folder holds "summary.md", "metrics.csv", "world.csv" and "runs.json"
    And "summary.md" gives every check's verdict, value and threshold, the flagged levers and the three largest gaps between strategies

  @BAL-026
  Scenario: War-price checks come first
    Given the check "War is paid for" failed and a sweep flagged "warfare.occupation.tax_share" as sensitive
    When the report is written
    Then the summary starts with the checks "War is not the best path", "War is paid for", "Conquest is answered" and "Wars end"
    And the failure of "War is paid for" names "warfare.occupation.tax_share" as the lever most likely to fix it

  @BAL-027
  Scenario: A failed check fails the command
    Given a full run set in which one check failed
    When the balance command ends
    Then it exits with a failure code

  @BAL-028 @placeholder
  Scenario: The quick run warns only
    Given a pull request changes the rules data
    When the quick run plays 2 seeds for 20 years with the Conqueror and the Court on 2 probe realms
    Then it finishes within 10 minutes
    And a failed check is shown as a warning that does not block the merge

  @BAL-029
  Scenario: Full runs and sweeps run on demand
    Given no pull request is open
    When a developer runs the full balance or a lever sweep
    Then it plays the full run set and writes its report
