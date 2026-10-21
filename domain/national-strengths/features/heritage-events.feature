@context-national-strengths
Feature: Heritage in events
  As the event tree
  I want effects and a condition for heritage
  So that events can reward, begin golden ages and overcome weaknesses, and require ambitions fulfilled

  @HER-064
  Scenario: grant_legacy
    Given the country "Poland" has 2 legacies
    When an event applies grant_legacy with id "council_decree" on "Poland"
    Then "Poland" holds the legacy "council_decree"

  @HER-065 @placeholder
  Scenario: wake_heyday
    Given the golden age "portugal_carreira_da_india" is inactive because "Portugal" lacks "S4"
    When an event applies wake_heyday on "Portugal" with years 5
    Then the golden age is active for 5 years even though its condition fails

  @HER-067
  Scenario: shed_burden
    Given the country "Kongo" has a weakness
    When a reform event applies shed_burden on "Kongo"
    Then the weakness is overcome and its turned legacy is granted

  @HER-068
  Scenario Outline: Events test and are weighted by heritage
    Given the country "<country>" <state>
    When the event "<event>" is considered
    Then <result>

    Examples:
      | country  | state                                           | event              | result                               |
      | Portugal | has its Atlantic golden age active              | da_gama_voyage     | the heritage condition holds          |
      | Muscovy  | has a legacy with event_weight +100 on the event | annexation_of_novgorod | the event's weight is doubled    |
      | Florence | has a legacy with event_option on the option    | peace_of_lodi      | the option is available              |
