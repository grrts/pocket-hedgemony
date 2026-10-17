@context-culture
Feature: Tongues, families and the court
  As the game
  I want every person to have a tongue in a family, and every country a court tongue
  So that each person is kin, cousin or stranger to the court, and Tongue % can be counted

  @CULT-001 @CULT-002 @CULT-003
  Scenario Outline: Tongues belong to families
    Given the tongue "<tongue>" is in config
    Then the tongue "<tongue>" belongs to the family "<family>"

    Examples:
      | tongue     | family          |
      | French     | latin           |
      | Occitan    | latin           |
      | Breton     | celtic          |
      | Mandinka   | mande           |
      | Swahili    | bantu           |
      | Lithuanian | baltic          |
      | Georgian   | caucasian       |
      | Armenian   | caucasian       |
      | Jewish     | hebrew          |
      | Criollo    | creole_atlantic |

  @CULT-002
  Scenario: The four added families
    Given the event tree's culture groups
    When the culture families are loaded
    Then the families include "celtic", "baltic", "caucasian" and "hebrew"
    And there are 43 families

  @CULT-004 @CULT-005 @CULT-006
  Scenario Outline: Catalogue culture strings map to tongues
    Given the catalogue culture string "<string>"
    When the catalogue strings are mapped to tongues
    Then the string maps to the tongue "<tongue>"
    And the tooltip shows the local name "<string>"

    Examples:
      | string                 | tongue      |
      | Jews                   | Jewish      |
      | Jewish communities     | Jewish      |
      | Swabians               | High German |
      | Westphalians           | Low German  |
      | Mandinka (Maninka)     | Mandinka    |

  @CULT-005
  Scenario: An unmapped string goes to the review list
    Given the catalogue culture string "Upland non-Tai neighbours" matches no tongue
    When the catalogue strings are mapped to tongues
    Then the string "Upland non-Tai neighbours" is on the review list

  @CULT-006
  Scenario Outline: Tongues kept apart where history turns on the split
    When the catalogue strings are mapped to tongues
    Then the tongues "<a>" and "<b>" are different tongues

    Examples:
      | a            | b          |
      | French       | Occitan    |
      | Castilian    | Catalan    |
      | Great Russian | Ruthenian |
      | High German  | Low German |

  @CULT-007
  Scenario: A tongue row carries its fields
    Given the tongue "Castilian" is in config
    Then it has an id, a name, the family "latin", a homeland and the way of life "settled"
    And it splits to "Criollo"
    And the tongue "Dyula" has the way of life "trading" and is a diaspora
    And the tongue "Tuscan" merges into "Italian"

  @CULT-008
  Scenario: No culture meter
    When the player opens the country card of "France"
    Then there is no culture meter, no cultural power and no list of accepted cultures

  @CULT-009 @CULT-086
  Scenario: Court tongue and province tongues at the start
    Given the catalogue record of "France" lists "French" as its first culture
    When the 1444 start is set up
    Then the court tongue of "France" is "French"
    And each province of "France" holds its top three tongues from the record's cultures and internal divisions, weighted to the homeland data

  @CULT-010 @CULT-011
  Scenario Outline: A new dynasty brings its tongue
    Given the country "England" has the court tongue "English"
    When a dynasty of the tongue "French" takes the throne of "England" by <way>
    Then the court tongue of "England" is "French"
    And people of the tongue "French" are kin to "England"
    And the music palette of "England" changes from the next track

    Examples:
      | way           |
      | conquest      |
      | inheritance   |
      | marriage      |
      | a lord's revolt |

  @CULT-012 @CULT-013
  Scenario Outline: Relation to the court
    Given the country "France" has the court tongue "French"
    Then people of the tongue "<tongue>" are <relation> to "France"
    And they count <weight> toward the Tongue % of "France"

    Examples:
      | tongue  | relation | weight |
      | French  | kin      | 1      |
      | Occitan | cousin   | 0.5    |
      | Breton  | stranger | 0      |
      | Flemish | stranger | 0      |

  @CULT-013 @CULT-088
  Scenario: Tongue % for France
    Given the realm of "France" holds 6.9 million French, 1.6 million Occitan, 0.5 million Breton, 0.4 million Flemish, 0.1 million Basque and 0.02 million Jewish people
    When the player opens the country card of "France"
    Then the Tongue % of "France" is 81

  @CULT-014 @placeholder
  Scenario: A trading people is never a stranger for grievances
    # config key: relation.trading.tongue_share_weight
    Given the country "France" has the court tongue "French"
    And the province "Paris" has a "Jewish" community
    When grievances are worked out
    Then the "Jewish" people of "Paris" give no "Foreign rule" grievance
    And they count as neither kin nor stranger for grievances
    And they count 0 toward the Tongue % of "France"

  @CULT-015
  Scenario Outline: Foreign rule before nationalism
    Given the country "France" has the court tongue "French"
    And the province "<province>" is the homeland of "<tongue>" with nationalism 0.1
    When grievances are worked out
    Then the province "<province>" <outcome> the grievance "Foreign rule"

    Examples:
      | province  | tongue  | outcome      |
      | Brittany  | Breton  | has          |
      | Toulouse  | Occitan | does not have |
