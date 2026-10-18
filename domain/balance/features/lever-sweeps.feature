@context-balance
Feature: Lever sweeps
  As the game's developers
  I want each provisional number scaled down and up in turn
  So that we find the numbers that do nothing and the ones that swing everything

  # Config keys: balance.sweep.levers, balance.sweep.factors, balance.sweep.targets, balance.sweep.dead,
  # balance.sweep.sensitive

  @BAL-022 @placeholder
  Scenario: A sweep scales one lever at a time
    Given a lever sweep over "warfare.occupation.tax_share" and "warfare.peace.max_ceded_share" with the factors 0.5 and 2
    When the sweep is played
    Then 4 run sets are played besides the base
    And each changes exactly one lever by one factor

  @BAL-023 @placeholder
  Scenario: A dead lever
    Given the lever "warfare.peace.long_war_years" targets the share of wars ended by an obliged peace
    And at the factors 0.5 and 2 that share moves by 1 % and 0.5 %
    When the sweep is checked
    Then "warfare.peace.long_war_years" is flagged as a dead lever

  @BAL-024 @placeholder
  Scenario: A sensitive lever
    Given at the factor 2 the lever "warfare.occupation.tax_share" changes which strategy ranks first in 30 % of the pairs
    When the sweep is checked
    Then "warfare.occupation.tax_share" is flagged as a sensitive lever
