@context-national-strengths
Feature: Heydays
  As a country
  I want strengths that arrive with my moment in history
  So that seizing my moment pays off

  @HER-008 @HER-009 @HER-010 @HER-011
  Scenario Outline: A heyday's life
    Given the country "Portugal" has the heyday "Carreira da Índia" of the "age_of_exploration"
    And its wakes condition is: an Atlantic harbour and knowing "S4"
    And <situation>
    When the heritage conditions are evaluated
    Then the heyday is <state>

    Examples:
      | situation                                                          | state                                   |
      | the age is not yet active                                          | waiting                                 |
      | the age is active and "Portugal" knows "S4" with an Atlantic harbour | awake                                  |
      | the age is active and "Portugal" has lost its Atlantic harbours     | asleep, keeping its years served        |
      | the age has ended                                                   | ended for good                          |

  @HER-009
  Scenario: Heydays follow the simulated ages
    Given the Atlantic crossing happens early in this campaign
    When the "age_of_atlantic_empires" begins early
    Then Atlantic heydays can wake early

  @HER-012 @placeholder
  Scenario Outline: A mark is left after 25 years
    Given the heyday "Carreira da Índia" was awake <years> years in total
    When its age ends
    Then <result>

    Examples:
      | years | result                                                              |
      | 24    | no mark is left                                                     |
      | 25    | the mark "Cape charts" is granted as a permanent legacy             |

  @HER-012 @placeholder
  Scenario: A heyday without a mark block
    Given a heyday with no mark block whose first lever is tax_reach_pct +15
    And it was awake 30 years
    When it ends
    Then a legacy with tax_reach_pct +5 is granted

  @HER-013
  Scenario: At most two heydays awake
    Given the country "Austria" has 2 heydays awake
    When a third heyday's wakes condition holds
    Then the player is asked which heyday sleeps
    And only 2 heydays are awake afterwards
