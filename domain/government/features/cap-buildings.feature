@context-government
Feature: Buildings that raise the caps
  As a player
  I want my palace, seats and court buildings to raise my officials and lords caps
  So that building up the court lets me govern more land and keep more lords

  @GOV-010 @GOV-011 @GOV-012 @GOV-013 @GOV-014 @GOV-015 @GOV-016 @GOV-017 @placeholder
  Scenario Outline: Each building adds to the caps
    # config key: buildings.<building>
    Given the country "Castile" has a <building> at step <step>
    When the caps are worked out
    Then the <building> adds <officials> officials and <lords> lords to the caps of "Castile"

    Examples:
      | building          | step | officials | lords |
      | palace            | 1    | 6         | 2     |
      | palace            | 2    | 10        | 4     |
      | palace            | 3    | 16        | 6     |
      | seat              | 1    | 2         | 0     |
      | seat              | 2    | 4         | 0     |
      | chancery          | 1    | 4         | 0     |
      | court of law      | 1    | 0         | 2     |
      | diet hall         | 1    | 0         | 3     |
      | hostage residence | 1    | 0         | 3     |
      | examination hall  | 1    | 4         | 0     |
      | parliament house  | 1    | 6         | 0     |

  @GOV-011 @GOV-012 @GOV-013 @GOV-016 @GOV-017
  Scenario Outline: Cap buildings that need an invention
    Given the country "Castile" does not have the invention "<invention>"
    When the country "Castile" tries to build a <building>
    Then the <building> is not available to "Castile"

    Examples:
      | building         | invention                   |
      | seat at step 2   | G11                         |
      | chancery         | G3 Tax registers            |
      | court of law     | G1 Written law codes        |
      | examination hall | G4 Examination system       |
      | parliament house | G14 Written constitution    |

  @GOV-014 @GOV-015
  Scenario Outline: Cap buildings limited to some forms
    Given the country "<country>" has the form "<form>"
    When the country "<country>" looks for a <building>
    Then the <building> is <availability> to "<country>"

    Examples:
      | country   | form              | building          | availability  |
      | France    | Feudal realm      | diet hall         | available     |
      | England   | Diet monarchy     | diet hall         | available     |
      | Poland    | Elective monarchy | diet hall         | available     |
      | Swiss     | Confederation     | diet hall         | available     |
      | Venice    | Merchant republic | diet hall         | not available |
      | Ottomans  | Household realm   | hostage residence | available     |
      | Mexica    | Tribute empire    | hostage residence | available     |
      | Crimea    | Horde             | hostage residence | available     |
      | Hosokawa  | Warlord domain    | hostage residence | available     |
      | Ashikaga  | Shogunate         | hostage residence | available     |
      | France    | Feudal realm      | hostage residence | not available |

  @GOV-011 @open-question
  Scenario: Seats are one per town and add for each
    # OQ-GOV-10: buildings design says one seat per province
    Given the country "Ottomans" has 4 seats at step 1 in 4 different towns
    When the caps are worked out
    Then the seats add 8 officials to the officials cap of "Ottomans"
