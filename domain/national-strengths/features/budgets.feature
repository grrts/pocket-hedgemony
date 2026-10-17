@context-national-strengths
Feature: Budgets
  As the designers
  I want every heritage part to spend a fair point budget
  So that a county's strength matters to it as much as an empire's

  @HER-045 @placeholder
  Scenario Outline: Part budgets
    Given a heritage "<part>"
    When its points are totalled
    Then its budget is <budget> points

    Examples:
      | part         | budget |
      | birthright   | 3      |
      | heyday       | 3      |
      | legacy       | 2      |
      | great legacy | 3      |
      | burden       | -2     |

  @HER-046 @HER-047 @placeholder
  # config: budget.size_bonus
  Scenario Outline: Size bonus
    Given the country "<country>" has size class <size>
    When its birthright budget is set
    Then its size bonus is <bonus> and its birthright budget is <budget>

    Examples:
      | country  | size | bonus | budget |
      | ming     | 4.5  | 0     | 3      |
      | france   | 4.2  | 0.5   | 3.5    |
      | portugal | 3.0  | 1.0   | 4      |
      | kongo    | 2.3  | 1.5   | 4.5    |
      | a county | 1.2  | 2.0   | 5      |

  @HER-048 @placeholder
  Scenario Outline: Scoping is cheaper
    Given the lever "tax_reach_pct" at +10 costs 1 point realm-wide
    When it is limited to <scope>
    Then it costs <points> points

    Examples:
      | scope                         | points |
      | the realm                     | 1      |
      | the capital                   | 0.5    |
      | one named area                | 0.25   |
      | the coast and one terrain     | 0.25   |

  @HER-049 @placeholder
  Scenario Outline: Special lever costs
    Given an effect "<effect>"
    When its cost is worked out
    Then it costs <points> points

    Examples:
      | effect                             | points |
      | ware_output_pct +10 for cloth      | 0.6    |
      | ware_output_pct +10 for all wares  | 1.8    |
      | stat stability +1                  | 1.0    |
      | stat legitimacy +10                | 1.0    |

  @HER-050 @placeholder
  Scenario Outline: The build checks every country
    Given the birthright of "<country>" totals <points> points against a budget of <budget>
    When heritage is built
    Then the report <lists> it as outside budget

    Examples:
      | country  | points | budget | lists        |
      | portugal | 3.9    | 4.0    | does not list |
      | example  | 4.8    | 4.0    | lists        |
