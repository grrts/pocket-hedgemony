@context-subjects
Feature: Colony stages
  As an overlord with colonies
  I want a colony to change as it grows
  So that settler realms can become self-governing and in time break away

  @SUBJ-022
  Scenario: An outpost
    Given the subject rules are in force
    When the country "Portugal" founds the colony "Ceuta"
    Then "Ceuta" is a Colony at stage "Outpost"
    And "Ceuta" pays 25 percent and has no army of its own
    And a governor of "Portugal", an official, runs it

  @SUBJ-023 @placeholder
  Scenario: Settled
    # config: kinds.colony.stages.settled
    Given the Colony "C" has 5 provinces, mostly of settler people
    When the stage is checked
    Then "C" is at stage "Settled"
    And "C" raises its own militia
    And its settlers form a voice that can be Wavering

  @SUBJ-024 @placeholder
  Scenario Outline: Self-governing
    # config: kinds.colony.stages.self_governing
    Given the Colony "C" has <provinces> provinces and has been a colony <years> years
    When the stage is checked
    Then "C" is at stage "<stage>"

    Examples:
      | provinces | years | stage          |
      | 10        | 50    | Self-governing |
      | 10        | 49    | Settled        |
      | 9         | 80    | Settled        |

  @SUBJ-024
  Scenario: A self-governing colony
    Given the Colony "C" is at stage "Self-governing"
    Then "C" pays 10 percent and keeps its own lords
    When its overlord tries to fold it in
    Then the order is refused
    But its overlord may release or keep it

  @SUBJ-025
  Scenario Outline: Settler independence trigger
    Given the Colony "C" at stage "<stage>" turns Disloyal
    When the season ends
    Then the revolutions context <gets> the settler-independence trigger

    Examples:
      | stage          | gets           |
      | Settled        | gets           |
      | Self-governing | gets           |
      | Outpost        | does not get   |
