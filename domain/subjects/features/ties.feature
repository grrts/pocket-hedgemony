@context-subjects
Feature: Subject ties
  As an overlord
  I want small labels that explain exceptions without adding types
  So that fiefs, kin and hostages behave as history says

  @SUBJ-017
  Scenario: Kin
    Given the subject "Dauphiné" is a Vassal of "France" with the tie "Kin"
    Then "Dauphiné" has the up reason "Kin" of +1
    When the ruling line of "France" dies out
    Then the ruler of "Dauphiné" has a claim to the throne of "France"

  @SUBJ-018 @placeholder
  Scenario: Held of the Church
    # config: ties.held_of_the_church
    Given the subject "Naples" is a Vassal of "Papal States" with the tie "Held of the Church"
    When "Papal States" goes to war
    Then "Naples" is never called
    And "Naples" pays only a token

  @SUBJ-019 @placeholder
  Scenario: Held in fief
    # config: ties.held_in_fief
    Given the subject "Andorra" is a Vassal of "Foix" with the tie "Held in fief"
    When "Foix" counts its subjects against its subject limit
    Then "Andorra" counts 0.5
    And "Andorra" pays only a token and is never called to war

  @SUBJ-020 @placeholder
  Scenario: Second master
    # config: ties.second_master.second_master_share
    Given the subject "S" is a Tributary of "O" with a "secondary_tribute" fact to "M"
    When the month ends
    Then "M" receives a small tribute and has no other rights over "S"
    When "O" and "M" go to war with "O" the stronger
    Then "S" leans to "O"

  @SUBJ-021 @placeholder
  Scenario Outline: Hostage at court
    # config: ties.hostage_at_court
    Given the overlord "O" holds the heir of the subject "S" at court
    When <event>
    Then "S" has the hostage reason at <arrow>

    Examples:
      | event                              | arrow |
      | the season ends                    | 1     |
      | "O" harms the hostage              | -2    |
