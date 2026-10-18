@context-culture
Feature: Languages, families and the court
  As the game
  I want every person to have a language in a family, and every country a court language
  So that each person's language is the court's own, related or foreign, and Language % can be counted

  @CULT-001 @CULT-002 @CULT-003
  Scenario Outline: Languages belong to families
    Given the language "<language>" is in config
    Then the language "<language>" belongs to the family "<family>"

    Examples:
      | language   | family          |
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
  Scenario Outline: Catalogue culture strings map to languages
    Given the catalogue culture string "<string>"
    When the catalogue strings are mapped to languages
    Then the string maps to the language "<language>"
    And the tooltip shows the local name "<string>"

    Examples:
      | string             | language    |
      | Jews               | Jewish      |
      | Jewish communities | Jewish      |
      | Swabians           | High German |
      | Westphalians       | Low German  |
      | Mandinka (Maninka) | Mandinka    |

  @CULT-005
  Scenario: An unmapped string goes to the review list
    Given the catalogue culture string "Upland non-Tai neighbours" matches no language
    When the catalogue strings are mapped to languages
    Then the string "Upland non-Tai neighbours" is on the review list

  @CULT-006
  Scenario Outline: Languages kept apart where history turns on the split
    When the catalogue strings are mapped to languages
    Then the languages "<a>" and "<b>" are different languages

    Examples:
      | a            | b          |
      | French       | Occitan    |
      | Castilian    | Catalan    |
      | Great Russian | Ruthenian |
      | High German  | Low German |

  @CULT-007
  Scenario: A language row carries its fields
    Given the language "Castilian" is in config
    Then it has an id, a name, the family "latin", a homeland and the way of life "settled"
    And it splits to "Criollo"
    And the language "Dyula" has the way of life "trading" and is a diaspora
    And the language "Tuscan" merges into "Italian"

  @CULT-008
  Scenario: No culture meter
    When the player opens the country card of "France"
    Then there is no culture meter, no cultural power and no list of accepted cultures

  @CULT-009 @CULT-086
  Scenario: Court language and province languages at the start
    Given the catalogue record of "France" lists "French" as its first culture
    When the 1444 start is set up
    Then the court language of "France" is "French"
    And each province of "France" holds its top three languages from the record's cultures and internal divisions, weighted to the homeland data

  @CULT-010 @CULT-011
  Scenario Outline: A new dynasty brings its language
    Given the country "England" has the court language "English"
    When a dynasty of the language "French" takes the throne of "England" by <way>
    Then the court language of "England" is "French"
    And the relation of the language "French" to "England" is "same language"
    And the music palette of "England" changes from the next track

    Examples:
      | way           |
      | conquest      |
      | inheritance   |
      | marriage      |
      | a lord's revolt |

  @CULT-012 @CULT-013
  Scenario Outline: Relation to the court
    Given the country "France" has the court language "French"
    Then the relation of the language "<language>" to "France" is "<relation>"
    And they count <weight> toward the Language % of "France"

    Examples:
      | language | relation      | weight |
      | French   | same language | 1      |
      | Occitan  | related       | 0.5    |
      | Breton   | foreign       | 0      |
      | Flemish  | foreign       | 0      |

  @CULT-013 @CULT-088
  Scenario: Language % for France
    Given the realm of "France" holds 6.9 million French, 1.6 million Occitan, 0.5 million Breton, 0.4 million Flemish, 0.1 million Basque and 0.02 million Jewish people
    When the player opens the country card of "France"
    Then the Language % of "France" is 81

  @CULT-014 @placeholder
  Scenario: A trading people is never foreign for grievances
    # config key: relation.trading.tongue_share_weight
    Given the country "France" has the court language "French"
    And the province "Paris" has a "Jewish" community
    When grievances are worked out
    Then the "Jewish" people of "Paris" give no "Foreign rule" grievance
    And they count as neither the same language nor foreign for grievances
    And they count 0 toward the Language % of "France"

  @CULT-015
  Scenario Outline: Foreign rule before nationalism
    Given the country "France" has the court language "French"
    And the province "<province>" is the homeland of "<language>" with nationalism 0.1
    When grievances are worked out
    Then the province "<province>" <outcome> the grievance "Foreign rule"

    Examples:
      | province  | language  | outcome      |
      | Brittany  | Breton  | has          |
      | Toulouse  | Occitan | does not have |
