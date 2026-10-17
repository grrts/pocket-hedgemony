@context-subjects
Feature: Subject reach
  As a ruler
  I want a limit on how many subjects I can watch over
  So that holding many subjects has a cost

  @SUBJ-056 @placeholder
  Scenario Outline: Reach from administrative capacity
    # config: reach_by_administrative_capacity
    Given the country "C" has the catalogue administrative capacity "<capacity>" and a government that changes nothing
    When its reach is counted
    Then the subject reach of "C" is <reach>

    Examples:
      | capacity  | reach |
      | very low  | 2     |
      | low       | 3     |
      | moderate  | 5     |
      | high      | 7     |
      | very high | 9     |

  @SUBJ-056
  Scenario: Reach and lord capacity are separate numbers
    Given the country "France" has a lord capacity and a subject reach
    When "France" gains a lord
    Then its subject reach is unchanged

  @SUBJ-057 @placeholder
  Scenario: The Ming's tributaries and marches
    # config: kinds.*.reach_weight
    Given the country "Ming" has reach 9
    And "Ming" holds 5 tributaries and 7 marches
    When its reach is counted
    Then "Ming" uses 6 reach of 9

  @SUBJ-058 @placeholder
  Scenario: Over reach
    # config: reasons.stretched_thin
    Given the country "O" has reach 7 and 9 subjects of weight 1
    When the season ends
    Then every subject of "O" has the reason "Stretched thin" at -1
    And the 2 furthest subjects of "O" have 1 more down arrow from being over reach
    And the other subjects of "O" have no more down arrows from being over reach

  @SUBJ-059 @placeholder
  Scenario: Naples costs the Pope 4 reach
    # config: subjects_with_subjects
    Given "Naples" is a Vassal of "Papal States"
    And "Taranto" is a subject of "Naples"
    When the reach of "Papal States" is counted
    Then "Naples" counts 4

  @SUBJ-060
  Scenario: Master of others
    Given "Naples" holds the subject "Taranto"
    When the season ends
    Then "Naples" has the reason "Master of others" at -3

  @SUBJ-061
  Scenario: Only the direct overlord acts
    Given "Taranto" is a subject of "Naples", a Vassal of "Papal States"
    When "Papal States" opens the card of "Taranto"
    Then "Papal States" has no buttons on "Taranto"
    And "Taranto" counts nothing in the reach of "Papal States" and pays it nothing

  @SUBJ-062
  Scenario: Breaking the chain
    Given "Naples" holds the subject "Taranto"
    When "Naples" releases "Taranto" as a peace term
    Then "Naples" no longer has the reason "Master of others"

  @SUBJ-063
  Scenario: Sub-subjects step up
    Given "Taranto" is a Wavering subject of "Naples", a Vassal of "Papal States"
    When "Papal States" folds in "Naples"
    Then "Taranto" is a subject of "Papal States"
    And "Taranto" is still "Wavering"
