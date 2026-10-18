@context-national-strengths
Feature: Golden ages
  As a country
  I want strengths that arrive with my moment in history
  So that seizing my moment pays off

  @HER-008 @HER-009 @HER-010 @HER-011
  Scenario Outline: A golden age's life
    Given the country "Portugal" has the golden age "Carreira da Índia" of the "age_of_exploration"
    And its start condition is: an Atlantic harbour and knowing "S4"
    And <situation>
    When the heritage conditions are evaluated
    Then the golden age is <state>

    Examples:
      | situation                                                          | state                                   |
      | the age is not yet active                                          | waiting                                 |
      | the age is active and "Portugal" knows "S4" with an Atlantic harbour | active                                 |
      | the age is active and "Portugal" has lost its Atlantic harbours     | inactive, keeping its years served      |
      | the age has ended                                                   | ended for good                          |

  @HER-009
  Scenario: Golden ages follow the simulated ages
    Given the Atlantic crossing happens early in this campaign
    When the "age_of_atlantic_empires" begins early
    Then Atlantic golden ages can begin early

  @HER-012 @placeholder
  Scenario Outline: A mark is left after 25 years
    Given the golden age "Carreira da Índia" was active <years> years in total
    When its age ends
    Then <result>

    Examples:
      | years | result                                                              |
      | 24    | no mark is left                                                     |
      | 25    | the mark "Cape charts" is granted as a permanent legacy             |

  @HER-012 @placeholder
  Scenario: A golden age without a mark block
    Given a golden age with no mark block whose first lever is tax_reach_pct +15
    And it was active 30 years
    When it ends
    Then a legacy with tax_reach_pct +5 is granted

  @HER-013
  Scenario: At most two golden ages active
    Given the country "Austria" has 2 golden ages active
    When a third golden age's start condition holds
    Then the player is asked which golden age becomes inactive
    And only 2 golden ages are active afterwards
