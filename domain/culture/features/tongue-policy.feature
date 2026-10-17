@context-culture
Feature: Tongue policy, the Own tongue charter and other levers
  As a player
  I want simple levers with costs to steer the tongues of my realm
  So that I choose between a faster common tongue and a quieter realm

  @CULT-038 @CULT-025 @placeholder
  Scenario Outline: Tongue policy sets drift toward the court
    # config key: policy.<policy>.drift
    Given the country "France" has the Tongue policy "<policy>"
    When a year ends
    Then drift toward the court tongue in "France" is multiplied by <multiplier>

    Examples:
      | policy | multiplier |
      | Let be | 0.5        |
      | Teach  | 1          |
      | Impose | 2          |

  @CULT-038
  Scenario: Teach is the default and provinces can override
    Given a new campaign starts
    Then the Tongue policy of "France" is "Teach"
    When the player sets the Tongue policy of the province "Bayonne" to "Let be"
    Then drift toward the court tongue in "Bayonne" is multiplied by 0.5
    And the realm-wide Tongue policy of "France" is still "Teach"

  @CULT-039 @placeholder
  Scenario: Teach costs school upkeep
    # config key: policy.teach.school_upkeep
    Given the country "France" has the Tongue policy "Teach"
    And the province "Troyes" has a school teaching in "French"
    When upkeep is paid
    Then the school in "Troyes" costs 10 % more upkeep

  @CULT-040 @CULT-041
  Scenario: Impose bans the tongue in stranger provinces
    Given the country "Castile" has the court tongue "Castilian" and the chancery tradition
    And the province "Granada" is mostly Andalusi Arabic (strangers)
    And the province "Barcelona" is mostly Catalan (cousins) with nationalism 0.1
    And the lord "Zegri" is of the tongue "Andalusi Arabic"
    When the country "Castile" sets the Tongue policy "Impose"
    Then the province "Granada" has the grievance "Banned tongue"
    And the province "Barcelona" does not have the grievance "Banned tongue"
    And the lord "Zegri" wavers one step
    And the lord "Zegri" does not waver again while "Impose" holds

  @CULT-040
  Scenario: Impose bans the tongue of cousins once nationalism is 0.3
    Given the country "Castile" has the Tongue policy "Impose"
    And the province "Barcelona" is mostly Catalan (cousins)
    When nationalism in "Barcelona" reaches 0.3
    Then the province "Barcelona" has the grievance "Banned tongue"

  @CULT-042 @CULT-043
  Scenario Outline: Impose needs printing unless there is a chancery tradition
    Given the date is 1444
    And the country "<country>" <printing> the invention "Printing"
    When the country "<country>" sets the Tongue policy "Impose"
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
  Scenario Outline: Banned tongue ends
    Given the province "Granada" has the grievance "Banned tongue"
    When <change>
    Then the province "Granada" does not have the grievance "Banned tongue"

    Examples:
      | change                                                   |
      | the Tongue policy becomes "Teach"                        |
      | the Tongue policy becomes "Let be"                       |
      | an "Own tongue" charter is granted in "Granada"          |
      | the majority of "Granada" becomes kin                    |

  @CULT-045 @CULT-046
  Scenario: The Own tongue charter
    Given the country "France" has the court tongue "French"
    And the province "Bayonne" is mostly Basque with the grievances "Foreign rule" and "Banned tongue"
    When the lords of "Bayonne" demand an "Own tongue" charter and it is granted
    Then the province "Bayonne" has neither "Foreign rule" nor "Banned tongue"
    And drift toward "French" stops in "Bayonne"
    And officials in "Bayonne" must be of the tongue "Basque"

  @CULT-046
  Scenario Outline: Who can bring an Own tongue charter
    When <who> in the province "Bayonne"
    Then an "Own tongue" charter can be granted in "Bayonne"

    Examples:
      | who                                   |
      | the ruler grants it                   |
      | its lords demand it                   |
      | its towns demand it                   |
      | a homeland rising demands it          |

  @CULT-047
  Scenario: Revoking the charter
    Given the province "Bayonne" has an "Own tongue" charter
    When the country "France" revokes it
    Then the province "Bayonne" has the grievance "Broken charter"

  @CULT-048
  Scenario: Keeping the local ruler as your lord ends Foreign rule
    Given the province "Brittany" is the Breton homeland held by "France"
    And the province "Brittany" has the grievance "Foreign rule"
    When the duke of Brittany, of the tongue "Breton", holds "Brittany" as a lord of "France"
    Then the province "Brittany" does not have the grievance "Foreign rule"

  @CULT-049
  Scenario: Marrying into a local house
    Given the country "France" has the court tongue "French"
    And the house "Montfort" is of the tongue "Breton"
    When the ruler of "France" marries into the house "Montfort"
    Then the lords of the house "Montfort" count as kin for loyalty

  @CULT-093
  Scenario Outline: Any form may choose any Tongue policy
    Given the country "<country>" has the government form "<form>"
    And the country "<country>" has the invention "Printing"
    When the country "<country>" sets the Tongue policy "<policy>"
    Then the policy is set

    Examples:
      | country | form              | policy |
      | Kazan   | Confederation     | Impose |
      | Venice  | Merchant republic | Let be |
      | France  | Absolute monarchy | Teach  |
