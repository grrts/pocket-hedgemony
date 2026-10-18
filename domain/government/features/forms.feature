@context-government
Feature: Government forms and what they set
  As the game
  I want each of the 27 government forms to set its part of the caps, subject reach, colonial range and succession
  So that how a country is ruled shapes what it can hold

  @GOV-018 @GOV-021 @GOV-022 @placeholder
  Scenario Outline: Each form's numbers
    # config key: forms.<form>
    Given the country "Testland" has the form "<form>"
    When the form's numbers are read
    Then the form belongs to the family "<family>"
    And the form gives <officials> officials and <lords> lords to the caps
    And the form changes subject reach by <subjects>
    And the colonial range of "Testland" is <range> sea zones
    And succession in "Testland" is "<succession>"

    Examples:
      | form                    | family   | officials | lords | subjects | range | succession                      |
      | Feudal realm            | house    | 6         | 8     | 0        | 20    | eldest heir                     |
      | Diet monarchy           | house    | 8         | 10    | 0        | 20    | eldest heir                     |
      | Household realm         | house    | 10        | 4     | 1        | 10    | strongest son                   |
      | Bureaucratic empire     | house    | 20        | 2     | 1        | 10    | named heir                      |
      | Elective monarchy       | house    | 4         | 12    | -1       | 10    | lords elect                     |
      | Absolute monarchy       | house    | 16        | 4     | 1        | 20    | eldest heir                     |
      | Constitutional monarchy | house    | 24        | 4     | 1        | 30    | eldest heir                     |
      | City commune            | citizens | 8         | 4     | -1       | 10    | council picks                   |
      | Merchant republic       | citizens | 10        | 4     | 1        | 30    | council picks                   |
      | Peasant commune         | citizens | 4         | 1     | -2       | 0     | assembly picks                  |
      | Constitutional republic | citizens | 24        | 0     | 0        | 30    | elections                       |
      | Prince-bishopric        | faith    | 6         | 3     | -1       | 5     | chapter elects                  |
      | Military order          | faith    | 8         | 4     | 0        | 15    | brothers elect                  |
      | Holy rule               | faith    | 6         | 4     | 0        | 5     | clergy choose                   |
      | Clan council            | kin      | 0         | 0     | -2       | 0     | elders choose                   |
      | Chiefdom                | kin      | 2         | 3     | -1       | 0     | chosen from the chief's lineage |
      | Paramount chiefdom      | kin      | 4         | 6     | 0        | 5     | chosen from the chief's lineage |
      | Tribute empire          | kin      | 6         | 12    | 3        | 5     | royal kin choose                |
      | Horde                   | kin      | 2         | 10    | 2        | 0     | eldest of the house             |
      | Confederation           | kin      | 2         | 10    | -1       | 0     | members take turns              |
      | Warlord domain          | warriors | 4         | 6     | 0        | 5     | heir or adopted son             |
      | Shogunate               | warriors | 8         | 14    | 3        | 10    | heir or adopted son             |
      | Soldier emirs           | warriors | 10        | 6     | 1        | 10    | emirs choose                    |
      | Military junta          | warriors | 20        | 2     | 0        | 15    | generals choose                 |
      | Party state             | modern   | 30        | 0     | 2        | 20    | the party chooses               |
      | Company rule            | modern   | 8         | 4     | 2        | 40    | owners appoint                  |

  @GOV-020
  Scenario: Colonial government holds no subjects
    Given the country "Genoese Gazaria" has the form "Colonial government"
    When its subject reach is worked out
    Then the country "Genoese Gazaria" has no subject reach and can hold no subjects
    And the colonial range of "Genoese Gazaria" is 15 sea zones
    And succession in "Genoese Gazaria" is "overlord appoints"

  @GOV-019 @placeholder
  Scenario Outline: Subject reach from administrative capacity and form
    # config keys: subject_reach_start, forms.<form>.subject_reach
    Given the country "<country>" has the catalogue administrative capacity "<capacity>"
    And the country "<country>" has the form "<form>"
    When its subject reach is worked out
    Then the subject reach of "<country>" is <reach>

    Examples:
      | country  | capacity  | form                | reach |
      | Ming     | very high | Bureaucratic empire | 10    |
      | Mexica   | high      | Tribute empire      | 10    |
      | Poland   | moderate  | Elective monarchy   | 4     |
      | Uri      | low       | Peasant commune     | 1     |
      | Igbo     | very low  | Clan council        | 0     |

  @GOV-023 @GOV-024
  Scenario Outline: Self-run forms need no official for their own people
    # D-GOV-13: own people are those whose largest language is the realm's own language; related languages do not count
    Given the country "Gowa" has the form "<form>" and the language "Makassarese"
    And the largest language of the province "<province>" of "Gowa" is "<language>"
    And the province "<province>" has no official
    When the month ends
    Then the province "<province>" <outcome>

    Examples:
      | form         | province | language    | outcome                                 |
      | Chiefdom     | Gowa     | Makassarese | needs no official and is not Ungoverned |
      | Clan council | Gowa     | Makassarese | needs no official and is not Ungoverned |
      | Chiefdom     | Bone     | Buginese    | still needs an official                 |
      | Feudal realm | Gowa     | Makassarese | still needs an official                 |

  @GOV-057
  Scenario Outline: Which forms count as monarchies for the Inquisition
    # D-GOV-15: by the form's event-tree value
    When the forms with the event-tree values "monarchy, elective_monarchy, constitutional_monarchy" are listed
    Then "<form>" <is> among them

    Examples:
      | form                    | is     |
      | Feudal realm            | is     |
      | Elective monarchy       | is     |
      | Constitutional monarchy | is     |
      | Tribute empire          | is     |
      | Shogunate               | is     |
      | Merchant republic       | is not |
      | Prince-bishopric        | is not |
      | Horde                   | is not |

  @GOV-025 @GOV-026 @placeholder
  Scenario: Colonial governors and the officials cap
    # config key: colonial_governors_count_against_officials_cap
    Given the country "Portugal" has an officials cap of 20 and 20 officials
    And the country "Portugal" has a colonial governor holding a governor slot
    When the caps are checked
    Then the governor is not counted against the officials cap of "Portugal"
    And no province of "Portugal" has the grievance "Grasping officials"
    When the governor's colony is founded
    Then the governor counts as that colony's official against the officials cap of "Portugal"
    And the country "Portugal" has 21 officials against a cap of 20
