@context-national-strengths
Feature: Heritage in events
  As the event tree
  I want effects and a condition for heritage
  So that events can reward, wake, stir and shed

  @HER-064
  Scenario: grant_legacy
    Given the country "Poland" has 2 legacies
    When an event applies grant_legacy with id "council_decree" on "Poland"
    Then "Poland" holds the legacy "council_decree"

  @HER-065 @placeholder
  Scenario: wake_heyday
    Given the heyday "portugal_carreira_da_india" is asleep because "Portugal" lacks "S4"
    When an event applies wake_heyday on "Portugal" with years 5
    Then the heyday is awake for 5 years even though its condition fails

  @HER-066
  Scenario: stir_ambition
    Given the country "Venice" has a sealed ambition
    When an event applies stir_ambition on it
    Then the ambition is stirred and shows its warmth
    And its words stay a hint

  @HER-067
  Scenario: shed_burden
    Given the country "Kongo" carries a burden
    When a reform event applies shed_burden on "Kongo"
    Then the burden is shed and its turned legacy is granted

  @HER-068
  Scenario Outline: Events test and are weighted by heritage
    Given the country "<country>" <state>
    When the event "<event>" is considered
    Then <result>

    Examples:
      | country  | state                                           | event              | result                               |
      | Portugal | has its Atlantic heyday awake                   | da_gama_voyage     | the heritage condition holds          |
      | Muscovy  | has a legacy with event_weight +100 on the event | annexation_of_novgorod | the event's weight is doubled    |
      | Florence | has a legacy with event_option on the option    | peace_of_lodi      | the option is available              |
