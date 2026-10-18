@context-culture
Feature: Language policy, the Own-language charter and other levers
  As a player
  I want simple levers with costs to steer the languages of my realm
  So that I choose between a faster common language and a quieter realm

  @CULT-038 @CULT-025 @placeholder
  Scenario Outline: Language policy sets drift toward the court
    # config key: policy.<policy>.drift
    Given the country "France" has the Language policy "<policy>"
    When a year ends
    Then drift toward the court language in "France" is multiplied by <multiplier>

    Examples:
      | policy | multiplier |
      | Let be | 0.5        |
      | Teach  | 1          |
      | Impose | 2          |

  @CULT-038
  Scenario: Teach is the default and provinces can override
    Given a new campaign starts
    Then the Language policy of "France" is "Teach"
    When the player sets the Language policy of the province "Bayonne" to "Let be"
    Then drift toward the court language in "Bayonne" is multiplied by 0.5
    And the realm-wide Language policy of "France" is still "Teach"

  @CULT-039 @placeholder
  Scenario: Teach costs school upkeep
    # config key: policy.teach.school_upkeep
    Given the country "France" has the Language policy "Teach"
    And the province "Troyes" has a school teaching in "French"
    When upkeep is paid
    Then the school in "Troyes" costs 10 % more upkeep

  @CULT-040 @CULT-041
  Scenario: Impose bans the language in foreign-language provinces
    Given the country "Castile" has the court language "Castilian" and the chancery tradition
    And the province "Granada" is mostly Andalusi Arabic (foreign)
    And the province "Barcelona" is mostly Catalan (related) with nationalism 0.1
    And the lord "Zegri" is of the language "Andalusi Arabic"
    When the country "Castile" sets the Language policy "Impose"
    Then the province "Granada" has the grievance "Banned language"
    And the province "Barcelona" does not have the grievance "Banned language"
    And the lord "Zegri" wavers one step
    And the lord "Zegri" does not waver again while "Impose" holds

  @CULT-040
  Scenario: Impose bans a related language once nationalism is 0.3
    Given the country "Castile" has the Language policy "Impose"
    And the province "Barcelona" is mostly Catalan (related)
    When nationalism in "Barcelona" reaches 0.3
    Then the province "Barcelona" has the grievance "Banned language"

  @CULT-042 @CULT-043
  Scenario Outline: Impose needs printing unless there is a chancery tradition
    Given the date is 1444
    And the country "<country>" <printing> the invention "Printing"
    When the country "<country>" sets the Language policy "Impose"
    Then the policy is <result>

    Examples:
      | country  | printing      | result  |
      | Ming     | does not have | set     |
      | Joseon   | does not have | set     |
      | Castile  | does not have | set     |
      | Ottomans | does not have | set     |
      | France   | does not have | refused |
      | France   | has           | set     |

  @CULT-044
  Scenario Outline: Banned language ends
    Given the province "Granada" has the grievance "Banned language"
    When <change>
    Then the province "Granada" does not have the grievance "Banned language"

    Examples:
      | change                                                      |
      | the Language policy becomes "Teach"                         |
      | the Language policy becomes "Let be"                        |
      | an "Own language" charter is granted in "Granada"           |
      | the majority of "Granada" comes to speak the court language |

  @CULT-045 @CULT-046
  Scenario: The Own-language charter
    Given the country "France" has the court language "French"
    And the province "Bayonne" is mostly Basque with the grievances "Foreign rule" and "Banned language"
    When the lords of "Bayonne" demand an "Own language" charter and it is granted
    Then the province "Bayonne" has neither "Foreign rule" nor "Banned language"
    And drift toward "French" stops in "Bayonne"
    And officials in "Bayonne" must be of the language "Basque"

  @CULT-046
  Scenario Outline: Who can bring an Own-language charter
    When <who> in the province "Bayonne"
    Then an "Own language" charter can be granted in "Bayonne"

    Examples:
      | who                                   |
      | the ruler grants it                   |
      | its lords demand it                   |
      | its towns demand it                   |
      | a homeland rising demands it          |

  @CULT-047
  Scenario: Revoking the charter
    Given the province "Bayonne" has an "Own language" charter
    When the country "France" revokes it
    Then the province "Bayonne" has the grievance "Broken charter"

  @CULT-048
  Scenario: Keeping the local ruler as your lord ends Foreign rule
    Given the province "Brittany" is the Breton homeland held by "France"
    And the province "Brittany" has the grievance "Foreign rule"
    When the duke of Brittany, of the language "Breton", holds "Brittany" as a lord of "France"
    Then the province "Brittany" does not have the grievance "Foreign rule"

  @CULT-049
  Scenario: Marrying into a local house
    Given the country "France" has the court language "French"
    And the house "Montfort" is of the language "Breton"
    When the ruler of "France" marries into the house "Montfort"
    Then the lords of the house "Montfort" count as the same language for loyalty

  @CULT-093
  Scenario Outline: Any form may choose any Language policy
    Given the country "<country>" has the government form "<form>"
    And the country "<country>" has the invention "Printing"
    When the country "<country>" sets the Language policy "<policy>"
    Then the policy is set

    Examples:
      | country | form              | policy |
      | Kazan   | Confederation     | Impose |
      | Venice  | Merchant republic | Let be |
      | France  | Absolute monarchy | Teach  |
