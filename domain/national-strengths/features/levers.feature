@context-national-strengths
Feature: Levers
  As the heritage system
  I want every effect to be a named lever on another design's rule
  So that heritage only changes things players can count

  @HER-035 @HER-036
  Scenario Outline: Lever definitions
    Given the lever "<lever>" in levers.json
    When it is read
    Then it is in group "<group>" with unit "<unit>", costs <points> points per unit and is owned by "<owner>"

    Examples:
      | lever               | group    | unit  | points | owner               |
      | tax_reach_pct       | treasury | pct   | 0.1    | province-stats 8    |
      | harvest_steps       | food     | steps | 1.2    | province-stats 5.1  |
      | grievance_shield    | rule     | flag  | 1.5    | province-stats 12.1 |
      | troop_cap_share     | army     | count | 2.0    | warfare 2.5         |
      | storm_loss_pct      | navy     | pct   | 0.03   | warfare 11.3        |
      | building_unlock     | building | flag  | 1.5    | buildings design    |

  @HER-035 @HER-036
  Scenario Outline: Trade levers act on trade v2
    Given the lever "<lever>" in levers.json
    When it is read
    Then it is in group "<group>" with unit "<unit>", costs <points> points per unit and is owned by "trade v2 (X-6)"
    And it changes "<meaning>"

    Examples:
      | lever               | group    | unit  | points | meaning                                                      |
      | trade_balance_pct   | treasury | pct   | 0.1    | Percent on the trade ratio gain in the affected provinces.   |
      | traders_passing_pct | trade    | pct   | 0.06   | Percent on the trade ratio gain in the affected provinces.   |
      | trader_gain_pct     | trade    | pct   | 0.08   | Percent on each deposit a trader makes (land, river or sea). |
      | trader_count        | trade    | count | 1.0    | Extra traders at the campaign start.                         |

  @HER-037
  Scenario: Scoped levers
    Given a legacy with official_type_pct +20 for "customs_officer" where "coast"
    When the legacy is applied
    Then customs officers are 20 % stronger in coastal provinces only

  @HER-038
  Scenario: Provisional levers
    Given the lever "faith_shift_pct" is provisional, waiting for the religion design
    When the religion design names its rule
    Then the lever can be renamed or pointed at that rule
    And only the key changes in heritage data

  @HER-039
  Scenario: A strength pulls one to three levers
    Given the golden age "Carreira da Índia"
    When its effects are read
    Then it pulls 3 levers: trader_gain_pct, building_cost_pct and official_type_pct
