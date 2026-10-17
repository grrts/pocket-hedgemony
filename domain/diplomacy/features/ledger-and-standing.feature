@context-diplomacy
Feature: Ledger and standing
  As a player
  I want every country's feeling toward me kept as a short ledger of named ties and wrongs
  So that I can read exactly why they like or hate me

  @DIPL-071 @DIPL-072
  Scenario: Venice's standing toward Hungary in 1444
    Given the date is "1444-11-11"
    And the countries "Venice" and "Hungary" share the Catholic faith
    And no other entry exists in the ledger of "Venice" toward "Hungary"
    When the game evaluates it
    Then the standing of "Venice" toward "Hungary" is +10
    And the event-tree `opinion` of "Venice" toward "Hungary" is +10

  @DIPL-072 @placeholder
  Scenario Outline: The stance line
    # config: ledger.stance_lines
    Given the relation of "A" toward "B" is "<relation>"
    When the game evaluates it
    Then the ledger line for the relation weighs <weight>

    Examples:
      | relation | weight |
      | alliance | 50     |
      | friendly | 30     |
      | neutral  | 0      |
      | rival    | -30    |
      | hostile  | -75    |
      | at_war   | -100   |
      | truce    | -10    |

  @DIPL-073 @placeholder
  Scenario Outline: Ties
    # config: ledger.ties
    Given the diplomacy rules are in force
    When the tie "<tie>" is added to the ledger of "A" toward "B" because <cause>
    Then it weighs <weight> and lasts "<lasts>"

    Examples:
      | tie                   | cause                                   | weight | lasts                      |
      | Married houses        | one living marriage                     | 15     | while the marriage lives   |
      | Married houses        | three living marriages                  | 30     | while the marriages live   |
      | Gift                  | a gift of 100 gold                      | 20     | fades over 10 years        |
      | Gift                  | a gift of 500 gold                      | 30     | fades over 10 years        |
      | Fought side by side   | a war fought on the same side           | 15     | fades over 20 years        |
      | Answered our call     | B joined A's war when asked             | 20     | fades over 20 years        |
      | Share a rival         | both are Rival toward "C"               | 15     | while true                 |
      | Same faith            | same faith by the religion rules        | 10     | while true                 |
      | Same culture group    | same culture group                      | 5      | while true                 |
      | Trade pact            | a trade pact in force                   | 10     | while in force             |
      | Pledged to protect us | B pledged to protect A                  | 15     | while in force             |
      | Freed us              | B won "Free a people" for A             | 40     | fades over 30 years        |

  @DIPL-074 @placeholder
  Scenario Outline: Wrongs
    # config: ledger.wrongs
    Given the diplomacy rules are in force
    When the wrong "<wrong>" is added to the ledger of "A" toward "B" because <cause>
    Then it weighs <weight> and lasts "<lasts>"

    Examples:
      | wrong                        | cause                                     | weight | lasts                  |
      | Took our land                | B took 3 provinces of A                   | -30    | fades over 20 years    |
      | Broke a truce with us        | B broke a truce with A                    | -40    | fades over 30 years    |
      | Broke our alliance           | B broke the alliance with A               | -40    | fades over 30 years    |
      | Abandoned us                 | B refused A's defensive call              | -30    | fades over 30 years    |
      | Insulted us                  | B insulted A                              | -20    | fades over 10 years    |
      | Threatened us                | B made a demand of A                      | -15    | fades over 10 years    |
      | Holds a claim                | B holds a dynastic claim on A             | -20    | while the claim stands |
      | Courted our lord             | B's courting was discovered               | -25    | fades over 10 years    |
      | Embargo against us           | B embargoes A                             | -15    | while in force         |
      | Different faith              | the faiths are hostile at the least       | -10    | while true             |
      | Different faith              | the faiths are hostile at the most        | -25    | while true             |
      | Notorious deed               | an event adds notoriety 2 to B            | -20    | fades over 30 years    |
      | Stirred revolt in our land   | B's rebel funding in A was caught         | -50    | fades over 20 years    |

  @DIPL-073
  Scenario: Austria's claim weighs on Hungary in 1444
    Given the fact "dynastic_claim" from "Austria" to "Hungary" for Ladislaus V
    When the game evaluates it
    Then the ledger of "Hungary" toward "Austria" holds "Holds a claim on our land or throne" at -20

  @DIPL-075
  Scenario: Fading in equal yearly steps
    Given the ledger of "A" toward "B" holds "Insulted us" at -20 fading over 10 years
    When 1 year passes
    Then "Insulted us" weighs -18
    When 9 more years pass
    Then "Insulted us" is gone

  @DIPL-076
  Scenario: The ledger holds at most 12 entries
    Given the ledger of "A" toward "B" holds 12 entries
    When a 13th entry is added
    Then the ledger holds at most 12 entries
    And the smallest entries are merged into "Old matters"

  @DIPL-077
  Scenario Outline: Standing words
    Given the standing of "A" toward "B" is <standing>
    When the game evaluates it
    Then the standing is shown as "<word>"

    Examples:
      | standing | word   |
      | 100      | Close  |
      | 99       | Warm   |
      | 30       | Warm   |
      | 29       | Cool   |
      | -29      | Cool   |
      | -30      | Cold   |
      | -99      | Cold   |
      | -100     | Bitter |

  @DIPL-078 @placeholder @open-question
  Scenario Outline: Oaths broken count against you everywhere
    # OQ-DIPL-18: which actions rely on your word; config: reasons.per_oath_broken
    Given the country "A" has broken 2 oaths in the last 30 years
    When the country "A" asks the country "B" for "<action>"
    Then the count holds the reason "Oaths broken" at <reason>

    Examples:
      | action           | reason |
      | propose alliance | -20    |
      | swear peace      | -20    |
      | arrange marriage | -20    |
      | trade pact       | -20    |
      | send gift        | 0      |

  @DIPL-079 @open-question
  Scenario: Lands taken weigh in neighbours' alliance counts
    # OQ-DIPL-17
    Given the country "A" took 2 provinces bordering the country "B" in the last 20 years
    When the country "A" proposes an alliance to the country "B"
    Then the count holds "You threaten our frontier" at -10

  @DIPL-080
  Scenario: The country card diplomacy line
    Given the country "Hungary" has 2 allies, 1 enemy, 0 oaths broken, 1 of 3 envoys abroad and 0 leagues against it
    When the game evaluates it
    Then the country card line reads "Allies 2", "Enemies 1", "Oaths broken 0", "Envoys 1 of 3 abroad", "Leagues against you 0"

  @DIPL-190
  Scenario: Ledgers only for pairs that have dealt with each other
    Given the countries "Portugal" and "Joseon" have never dealt with each other
    When the game evaluates it
    Then no ledger exists between "Portugal" and "Joseon"

  @DIPL-190
  Scenario: Fades are recomputed once a year
    Given the ledger of "A" toward "B" holds "Gift" at +20 fading over 10 years
    When 11 months pass within the same year
    Then "Gift" still weighs +20
