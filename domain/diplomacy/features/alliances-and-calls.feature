@context-diplomacy
Feature: Alliances and calls to arms
  As a player
  I want allies who must come when I am attacked and may come when I attack
  So that an alliance means something and its limits are clear

  @DIPL-094
  Scenario Outline: Proposing an alliance needs peace, no hostility and no subject tie
    Given the countries "A" and "B" <situation>
    When the country "A" proposes an alliance to the country "B"
    Then the proposal is <result>

    Examples:
      | situation                     | result  |
      | are at peace with no stance   | sent    |
      | are at war                    | refused |
      | have B Hostile toward A       | refused |
      | have A as a subject of B      | refused |

  @DIPL-094
  Scenario: An agreed alliance replaces a truce
    Given the countries "A" and "B" have a truce
    When the country "B" agrees to an alliance with the country "A"
    Then the countries "A" and "B" are allied
    And they have no truce

  @DIPL-095 @DIPL-099
  Scenario Outline: Defensive calls go out when you are attacked
    Given the country "Hungary" is allied with the country "Wallachia"
    When <war> 
    Then <call>

    Examples:
      | war                                                                    | call                                       |
      | the country "Ottomans" declares war on "Hungary"                       | "Wallachia" gets a defensive call this turn |
      | "Hungary", a subject of "X", starts its independence war               | "Wallachia" gets no defensive call         |
      | "Ottomans" declares war after "Hungary" refused its demand            | "Wallachia" gets no defensive call         |

  @DIPL-096
  Scenario: Refusing a defensive call breaks the alliance
    Given the country "Hungary" is allied with the country "Wallachia"
    And the country "Ottomans" declared war on "Hungary"
    When the country "Wallachia" refuses the defensive call
    Then "Hungary" and "Wallachia" are no longer allied
    And the country "Wallachia" gains an Oath broken
    And the ledger of "Hungary" toward "Wallachia" holds "Abandoned us" at -30

  @DIPL-097
  Scenario: Refusing an offensive call breaks nothing
    Given the country "Hungary" is allied with the country "Papal States"
    And the country "Hungary" declared war on "Ottomans"
    When the country "Papal States" refuses the offensive call
    Then "Hungary" and "Papal States" are still allied
    And no tie or wrong is added

  @DIPL-098 @placeholder
  Scenario Outline: The call count
    # config: actions.call_to_arms
    Given a "<kind>" call to the country "B"
    And the target is <concern>
    And the country "B" <at_war>
    And the enemy side has <multiple> times the soldiers of "B"
    When the game evaluates it
    Then the call's own reasons total <number>

    Examples:
      | kind      | concern                 | at_war              | multiple | number |
      | defensive | not B's concern         | is not at war       | 0        | -20    |
      | offensive | not B's concern         | is not at war       | 0        | -50    |
      | defensive | B's Rival               | is not at war       | 0        | 10     |
      | offensive | B's Hostile             | is already at war   | 2        | -70    |
      | defensive | not B's concern         | is not at war       | 6        | -60    |

  @DIPL-099
  Scenario: Calls are instant and answered a month later
    Given the date is "1445-05"
    When the country "Hungary" calls the country "Wallachia" to arms
    Then the call reaches "Wallachia" in "1445-05"
    And "Hungary" learns the answer in "1445-06"

  @DIPL-100
  Scenario: An ally fights its own war
    Given the country "Wallachia" joined the war of "Hungary"
    Then the armies of "Wallachia" stay under the command of "Wallachia"
    And "Wallachia" counts its own peace voices
    When "Hungary" makes peace with the country "Ottomans"
    Then "Wallachia" is named in the peace and gets the truce

  @DIPL-101 @placeholder
  Scenario: A separate peace
    # config: actions.call_to_arms.separate_peace_when_peace_voices_over
    Given the country "Venice" answered the call of "Hungary" against "Ottomans"
    And over half of the peace voices of "Venice" say peace
    When the country "Venice" makes a separate peace with the country "Ottomans"
    Then the country "Venice" gains no Oath broken
    And the ledger of "Hungary" toward "Venice" loses the tie "Answered our call"

  @DIPL-102
  Scenario: Ties from fighting together
    Given the country "Wallachia" joined the war of "Hungary" when asked
    Then the ledger of "Hungary" toward "Wallachia" holds "Answered our call" at +20
    When the war ends
    Then each ledger between them holds "Fought side by side" at +15

  @DIPL-103 @DIPL-033
  Scenario: Breaking an alliance
    Given the countries "Hungary" and "Venice" are allied
    When the country "Venice" breaks the alliance with the country "Hungary"
    Then "Hungary" and "Venice" are no longer allied
    And the country "Venice" gains an Oath broken
    And the ledger of "Hungary" toward "Venice" holds "Broke our alliance" at -40
