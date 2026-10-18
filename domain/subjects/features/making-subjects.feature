@context-subjects
Feature: Making a subject
  As a country
  I want several ways to gain subjects
  So that subjects come from peace, protection, grants, colonies, inheritance and events

  @SUBJ-083
  Scenario Outline: Peace term Become a subject
    Given the era is "<era>"
    And the loser "L" <path> the winner "W"
    And over three quarters of the peace voices of "L" say peace
    When "W" asks the term "Become a subject" as a "<kind>"
    Then the term is <result>

    Examples:
      | era | path                         | kind         | result  |
      | II  | has a land path to           | Vassal       | allowed |
      | II  | has a land path to           | Tributary    | allowed |
      | II  | has no land path to          | Vassal       | refused |
      | II  | has no land path to          | Tributary    | allowed |
      | VI  | has a land path to           | Protectorate | allowed |

  @SUBJ-084
  Scenario Outline: After twenty years of tribute
    Given "L" has paid tribute to "W" as a peace term for 20 years
    And "L" is <strength> than "W"
    When "W" offers "L" to become a Tributary by envoy
    Then "L" <answer>

    Examples:
      | strength | answer   |
      | weaker   | accepts  |
      | stronger | refuses  |

  @SUBJ-085
  Scenario: Seating a pretender
    Given "W" won a war with the aim "Seat a pretender" against "L"
    When the pretender takes the throne of "L"
    Then "W" picks "L" as its Vassal or its ally
    And the new ruler of "L" starts "Loyal"

  @SUBJ-086
  Scenario Outline: A subject by agreement
    Given diplomacy's count said yes to <ask>
    When the subjects context makes the subject
    Then "S" becomes a "<kind>" of "P"

    Examples:
      | ask                                        | kind      |
      | "P" offering overlordship to "S"           | Tributary |
      | "S" asking "P" for protection as a Vassal  | Vassal    |

  @SUBJ-087
  Scenario: Inheritance makes a Union
    Given the ruler of "Castile" inherits the crown of "Aragon" after a marriage
    When the inheritance is received
    Then "Aragon" is a Union of "Castile"

  @SUBJ-088
  Scenario Outline: Frontier grant
    Given the chief "C" <subject> and <border>
    When "Ming" gives its titles to "C" with a gift
    Then the grant is <result>

    Examples:
      | subject                 | border                     | result                     |
      | is nobody's subject     | shares a border with "Ming"| made: "C" is a March       |
      | is a subject of "Oirat" | shares a border with "Ming"| refused                    |
      | is nobody's subject     | shares no border with "Ming" | refused                  |

  @SUBJ-089
  Scenario: Chartering a colony
    Given "Portugal" holds 4 colonial provinces in one distant region
    When "Portugal" charters them
    Then they form one Colony of "Portugal"

  @SUBJ-090
  Scenario Outline: Events make subjects
    Given the subject rules are in force
    When an event uses "<key>" for "S" under "O"
    Then "S" is a "<kind>" of "O"

    Examples:
      | key                                     | kind                     |
      | vassalize with type tributary           | Tributary                |
      | create_country subject_of               | Colony at Self-governing |
      | create_country subject_of as a Vassal   | Vassal                   |
      | relation personal_union                 | Union                    |
