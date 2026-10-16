@context-diplomacy
Feature: Declaring war
  As a country
  I want to declare war on a target with one aim and see who will be called
  So that war starts openly and pulls in the right countries

  @DIPL-148 @DIPL-189 @open-question
  Scenario: Hungary prepares to declare war on the Ottomans
    # OQ-DIPL-33: Serbia is a tributary, which never joins its overlord's wars
    Given the country "Hungary" holds the aim "Take land" for "Nikopol" from the Want of its lord John Hunyadi
    When the player opens the war declaration sheet against "Ottomans"
    Then the sheet shows the aim "Take land — Nikopol" and its source
    And the sheet shows "Wallachia" and "Papal States" as called on the side of "Hungary"
    And the sheet shows "Serbia" joining the "Ottomans" as a subject
    And the sheet shows how many of the voices of "Hungary" lean to peace
    And the sheet does not show how the called countries will answer
    And the sheet offers "Send a demand first" and "Declare"

  @DIPL-148
  Scenario: A war needs exactly one held aim
    Given the country "A" holds no aim "Tribute" against "B"
    When the country "A" declares war on "B" with the aim "Tribute"
    Then the declaration is refused

  @DIPL-149
  Scenario Outline: Pacts must be broken first
    Given the country "A" has a "<pact>" with the country "B"
    When the country "A" declares war on "B"
    Then the declaration is refused until the "<pact>" is broken
    And breaking the "<pact>" gives "A" an Oath broken

    Examples:
      | pact   |
      | alliance |
      | truce  |
      | pledge |

  @DIPL-150
  Scenario: Calls go out the same turn
    Given the date is "1445-05"
    And the country "A" is allied with "C"
    And the country "B" is allied with "D" and pledged by "E"
    And the country "B" has the vassal "V"
    And a league against "A" includes "L"
    When the country "A" declares war on the country "B"
    Then "C" gets an offensive call in "1445-05"
    And "D" and "E" get defensive calls in "1445-05"
    And "V" joins by its kind
    And "L" is called against "A"
    And the answers arrive in "1445-06"

  @DIPL-151
  Scenario Outline: Everyone sees the aim; a war with no aim threatens the neighbours
    Given the diplomacy rules are in force
    When the country "A" declares war on "B" with the aim "<aim>"
    Then every country sees the aim "<aim>"
    And every neighbour of "A" <gains> the wrong "Threatened us" toward "A"

    Examples:
      | aim       | gains         |
      | Take land | does not gain |
      | No aim    | gains         |

  @DIPL-152 @open-question
  Scenario Outline: Subjects without their own diplomacy cannot declare war
    # OQ-DIPL-10: which kinds have their own diplomacy
    Given the country "S" is a subject of "O" of the relation kind "<kind>"
    When the country "S" declares war on the country "X"
    Then the declaration is <result>

    Examples:
      | kind           | result   |
      | personal_union | refused  |
      | colony         | refused  |
      | tributary      | accepted |

  @DIPL-153 @placeholder
  Scenario Outline: A regency fights only defensive wars and raids
    # config: war_aims.regency_allows
    Given the ruler of "Hungary" is a child under a regent
    When the country "Hungary" <action>
    Then the action is <result>

    Examples:
      | action                                         | result   |
      | declares war on "Ottomans" with aim "Raid"     | allowed  |
      | declares war on "Ottomans" with aim "Take land"| refused  |
      | answers a defensive call                       | allowed  |
