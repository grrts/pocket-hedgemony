@context-subjects
Feature: What the overlord can do
  As an overlord
  I want buttons on each subject's card that cost things I already count
  So that keeping subjects is a matter of envoys, gold, officials and loyalty

  @SUBJ-037 @placeholder
  Scenario Outline: Setting tribute
    # config: tribute_levels
    Given the Loyal Tributary "S" owes 10 gold a month at normal tribute
    When its overlord sets tribute to "<level>"
    Then "S" pays <gold> gold a month
    And "S" has <reason>

    Examples:
      | level    | gold | reason                                 |
      | none     | 0    | no tribute reason                      |
      | light    | 5    | the reason "Light tribute" at 1        |
      | normal   | 10   | no tribute reason                      |
      | heavy    | 15   | the reason "Heavy tribute" at -1       |
      | crushing | 20   | the reason "Crushing tribute" at -2    |

  @SUBJ-038
  Scenario Outline: Calling a subject to war
    Given the subject "S" is a <loyalty> "<kind>"
    When its overlord calls it to war
    Then "S" <answer>

    Examples:
      | kind      | loyalty  | answer                               |
      | Vassal    | Loyal    | comes at once with its whole army    |
      | Vassal    | Wavering | comes with half its army, late       |
      | Vassal    | Disloyal | refuses                              |
      | Tributary | Loyal    | is not called                        |

  @SUBJ-039 @placeholder @open-question
  Scenario: A gift
    # OQ-SUBJ-10: how the gift scales with income; config: reasons.gift
    Given the subject rules are in force
    When the overlord sends the subject "S" a gift scaled to its income
    Then "S" has the reason "Gift" at 1 for 5 years

  @SUBJ-040
  Scenario: A resident at a subject's court
    Given the country "England" has an envoy courting "Brittany"
    And "Brittany" is Disloyal
    When "France" stations a resident at the court of "Brittany"
    Then one envoy of "France" stays there
    And "Brittany" has the reason "Resident at court" at 1
    And "France" sees the envoy of "England" courting "Brittany"
    And "France" sees the true size of the army of "Brittany"

  @SUBJ-041
  Scenario: Lending an official
    Given the subject rules are in force
    When "France" lends a Steward to "Brittany" and pays his wages
    Then "Brittany" has an up reason at 1 for the lent official
    And the Steward's type effect applies in the land of "Brittany"

  @SUBJ-042
  Scenario Outline: Taking a hostage
    Given the subject "S" is "<loyalty>"
    When its overlord takes a hostage from "S"
    Then the order is <result>

    Examples:
      | loyalty  | result   |
      | Loyal    | accepted |
      | Wavering | accepted |
      | Disloyal | refused  |

  @SUBJ-042
  Scenario: The hostage goes home
    Given the overlord "O" holds the heir of "S" at court
    When the ruler of "S" dies
    Then the heir returns to "S"

  @SUBJ-043
  Scenario: A marriage with a subject
    Given the subject rules are in force
    When the houses of "France" and its subject "S" are joined by a marriage
    Then "S" has the reason "Marriage" at 1
    And a Union may follow if a ruler dies without heirs

  @SUBJ-044 @placeholder
  Scenario Outline: Tightening
    # config: tighten
    Given the subject "S" is a <loyalty> "<kind>"
    When its overlord tightens "S"
    Then <result>

    Examples:
      | kind      | loyalty  | result                                                     |
      | Tributary | Loyal    | after one envoy spends 6 months, "S" is a Vassal          |
      | Tributary | Wavering | "S" refuses and drops a step to Disloyal                  |
      | Vassal    | Loyal    | the order is refused: Vassal to Union is not possible     |

  @SUBJ-045 @placeholder
  Scenario Outline: Loosening
    # config: loosen, reasons.loosened
    Given the subject "S" is a Disloyal "<kind>"
    When its overlord loosens "S"
    Then "S" is a Tributary
    And "S" has the reason "Loosened" at 2 for 10 years

    Examples:
      | kind         |
      | Vassal       |
      | Protectorate |

  @SUBJ-046 @open-question
  Scenario: Releasing a subject
    # OQ-SUBJ-12: the Courted reason for neighbours
    Given the subject "S" is a Vassal of "O"
    When "O" releases "S"
    Then "S" is independent
    And "S" is Friendly toward "O"
    And no other subject of "O" gains or loses a reason

  @SUBJ-047 @placeholder
  Scenario Outline: Deposing a subject's ruler
    # config: reasons.deposed_other_subject
    Given the subject "S" <condition>
    When its overlord deposes the ruler of "S"
    Then <result>

    Examples:
      | condition                                     | result                                                                 |
      | has a Disloyal ruler                          | the candidate rules "S" and starts Loyal, and every other subject has -1 for 5 years |
      | has a Loyal ruler and no pretender at court   | the order is refused                                                   |
      | is In revolt                                  | the order is refused until the war is won                              |

  @SUBJ-048
  Scenario: A locked button names its first missing requirement
    Given the subject "Brittany" is Wavering
    When the player opens the card of "Brittany"
    Then the button "Fold in" is locked and reads "Wavering"
