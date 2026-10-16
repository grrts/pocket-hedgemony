@context-subjects
Feature: Events and subjects
  As an event writer
  I want to read and write subjects through event keys
  So that historical chains can make, loosen and break subjects

  @SUBJ-097
  Scenario Outline: Event keys
    Given the subject rules are in force
    When an event uses "<key>"
    Then <effect>

    Examples:
      | key                                       | effect                                                       |
      | vassalize who target type                 | a subject is created of the mapped kind                      |
      | release who target                        | the subject is released                                      |
      | relation type subject                     | the Subject relation and its kind are read                   |
      | subject_count                             | the number of subjects is read, by reach weights only if asked |
      | subject_loyalty who target op step        | a loyalty step is tested                                     |
      | add_subject_reason target reason months   | a reason is added by id for the months given                 |
      | remove_subject_reason                     | a reason is removed by id                                    |
      | change_subject_kind who target kind       | the kind is tightened or loosened                            |

  @SUBJ-097 @SUBJ-035
  Scenario: The Kalmar Union breaking
    Given the date is "1444-11-11"
    And "Sweden" is a Wavering Union of "Denmark"
    When events add down reasons to "Sweden" through 1448
    Then "Sweden" can fall to "Disloyal" by 1448
