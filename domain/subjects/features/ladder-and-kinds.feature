@context-subjects
Feature: Ladder of rule and kinds of subject
  As an overlord
  I want six kinds of subject, each owing and keeping different things
  So that subjects are a real third way to hold land besides officials and lords

  @SUBJ-001
  Scenario Outline: Every piece of land sits on one rung
    Given the province "<province>" is <held>
    When the game evaluates it
    Then the province "<province>" is on the rung "<rung>"

    Examples:
      | province | held                                      | rung           |
      | Paris    | run by an official of "France"            | royal land     |
      | Orléans  | held by a lord of "France"                | lord's land    |
      | Rennes   | in "Brittany", a subject of "France"      | subject realm  |
      | London   | in "England", which has no overlord       | independent    |

  @SUBJ-002
  Scenario Outline: Subject or lord
    Given the realm "<realm>" under "France" <has>
    When the game evaluates it
    Then "<realm>" is a "<what>"

    Examples:
      | realm    | has                                                         | what    |
      | Brittany | its own country on the map with treasury, army, lords and diplomacy | subject |
      | Anjou    | no country of its own on the map                             | lord    |

  @SUBJ-003
  Scenario: A catalogue subject that is not a map nation starts as a lord
    Given the catalogue lists "Alençon" as a subject of "France"
    And the 1444 map has no nation "Alençon"
    When the scenario starts
    Then "Alençon" is a lord of "France" with a lord card filled from the catalogue's history

  @SUBJ-004
  Scenario Outline: Six kinds and their icons
    Given the subject "S" is of the kind "<kind>"
    When the game evaluates it
    Then its icon is "<icon>"

    Examples:
      | kind         | icon        |
      | Vassal       | shield      |
      | Tributary    | chest       |
      | Union        | two crowns  |
      | March        | watchtower  |
      | Colony       | anchor      |
      | Protectorate | key         |

  @SUBJ-005 @SUBJ-006 @placeholder
  Scenario Outline: What each kind pays at normal tribute
    # config: kinds.*.pays_share
    Given the subject "S" is a Loyal "<kind>" with an income of 100 gold a month at normal tribute
    When the month ends
    Then "S" pays its overlord <gold> gold from its treasury

    Examples:
      | kind         | gold |
      | Vassal       | 10   |
      | Tributary    | 15   |
      | Union        | 5    |
      | March        | 0    |
      | Colony       | 25   |
      | Protectorate | 10   |

  @SUBJ-005
  Scenario: A colony's trade goods flow home first
    Given the subject "Chios" is a Colony of "Genoa"
    When the game evaluates it
    Then the trade goods of "Chios" flow to "Genoa" first

  @SUBJ-007
  Scenario: Tribute in grain
    Given the overlord "Castile" takes the tribute of "Granada" in grain
    When the month ends
    Then the grain arrives at the nearest castle of "Castile"
    And it counts toward the Food of "Castile"

  @SUBJ-008
  Scenario Outline: Who fights for the overlord
    Given the subject "S" is a <loyalty> "<kind>" of "O"
    When "O" goes to war <where>
    Then "S" <fights>

    Examples:
      | kind         | loyalty  | where                         | fights                                 |
      | Vassal       | Loyal    | when called                   | comes at once with its whole army      |
      | Tributary    | Loyal    | when called                   | never comes                            |
      | Union        | Wavering | anywhere                      | comes                                  |
      | Union        | Disloyal | anywhere                      | does not come                          |
      | March        | Loyal    | on the March's own frontier   | fights and raids the enemy there       |
      | March        | Loyal    | far from its frontier         | does not come                          |
      | Colony       | Loyal    | anywhere                      | defends itself only                    |
      | Protectorate | Loyal    | when called                   | comes                                  |

  @SUBJ-009
  Scenario Outline: Own diplomacy by kind
    Given the subject "S" is a "<kind>" of "O"
    When "S" <act>
    Then the act is <result>

    Examples:
      | kind         | act                                         | result  |
      | Vassal       | allies with a country at war with "O"       | refused |
      | Vassal       | signs a trade pact with a third country     | allowed |
      | Tributary    | allies with any country                     | allowed |
      | Union        | sends an envoy of its own                   | refused |
      | March        | proposes an alliance                        | refused |
      | Colony       | sends an envoy of its own                   | refused |
      | Protectorate | sends an envoy of its own                   | refused |

  @SUBJ-010
  Scenario Outline: Who may hold subjects of its own
    Given the subject "S" is a "<kind>"
    When "S" would gain a subject
    Then it is <result>

    Examples:
      | kind         | result  |
      | Vassal       | allowed |
      | Tributary    | allowed |
      | Union        | allowed |
      | March        | refused |
      | Colony       | refused |
      | Protectorate | refused |

  @SUBJ-011
  Scenario Outline: What the overlord owes
    Given the subject "S" is a "<kind>" of "O"
    When the game evaluates it
    Then "O" owes "S" <owed>

    Examples:
      | kind         | owed                                           |
      | Vassal       | defence when attacked                          |
      | Tributary    | defence when attacked by anyone but "O"        |
      | Union        | defence and one ruler for both                 |
      | March        | a yearly stipend of gold or titles             |
      | Colony       | defence and ships on its sea route             |
      | Protectorate | defence                                        |

  @SUBJ-012 @placeholder
  Scenario Outline: A kind's drift
    # config: kinds.*.drift
    Given the subject "S" is a "<kind>"
    When the game evaluates it
    Then its reasons include a kind drift of <drift>

    Examples:
      | kind         | drift |
      | Vassal       | 0     |
      | Tributary    | -1    |
      | Union        | 0     |
      | March        | -1    |
      | Colony       | 0     |
      | Protectorate | -1    |

  @SUBJ-013
  Scenario Outline: When protectorates are allowed
    Given the era is "<era>"
    And the country "O" <empire> an overseas trade empire
    When "O" would make a Protectorate
    Then it is <result>

    Examples:
      | era | empire | result  |
      | III | is     | refused |
      | IV  | is     | allowed |
      | IV  | is not | refused |
      | VI  | is not | allowed |
