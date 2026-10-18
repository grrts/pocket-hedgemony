@context-subjects
Feature: Subject AI
  As an AI country
  I want to read the same badges as the player
  So that my choices about subjects can be read and anticipated

  @SUBJ-098
  Scenario Outline: The AI as overlord
    Given the AI overlord "O" <situation>
    When the AI turn runs
    Then "O" <does>

    Examples:
      | situation                                                                    | does                                         |
      | has a Loyal subject that meets every fold-in requirement and likes centralising | folds it in                               |
      | is at war elsewhere and has a Disloyal Vassal                                 | loosens it                                   |
      | has a big Wavering subject and a free envoy                                   | stations a resident there                    |
      | is at subject limit 7 of 7                                                    | gains no subject that would take it past 8   |

  @SUBJ-099
  Scenario Outline: The AI as subject
    Given the AI subject "S" is Disloyal with the personality "<personality>"
    And <situation>
    When the AI turn runs
    Then "S" <does>

    Examples:
      | personality | situation                                    | does                             |
      | opportunist | its overlord is losing a war                 | rises at once                    |
      | cautious    | its overlord is losing a war and it has no backer | waits for a backer and its neighbours |
      | cautious    | it has no backer                             | looks for a backer               |

  @SUBJ-100
  Scenario: The AI as a rival
    Given the AI country "England" is a rival of "France"
    And "Brittany" is a Wavering subject of "France"
    When the AI turn runs
    Then "England" may send an envoy to court "Brittany"
    And "England" picks "Break a subject" against the overlord with the most Disloyal subjects among its rivals

  @SUBJ-101
  Scenario: Loyalty is worked out once a season
    Given several hundred subjects exist
    When a month that is not a season end passes
    Then no subject's loyalty is recomputed
