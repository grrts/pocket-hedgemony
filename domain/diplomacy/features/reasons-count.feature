@context-diplomacy
Feature: The reasons count
  As a player
  I want every yes or no to be a list of reasons with numbers, delivered a month after
  So that I can see why and try again differently

  Background:
    Given the date is "1444-11-11"
    And the country "Hungary" is at war with the country "Ottomans"
    And the country "Venice" is at war with the country "Ottomans"
    And the country "Venice" is allied with the country "Florence"
    And the country "Venice" has posture "hegemon seeker" and negotiation "high"

  @DIPL-081 @DIPL-084 @DIPL-086 @DIPL-090 @DIPL-092 @placeholder
  Scenario: Hungary asks Venice for an alliance and is refused
    # config: reasons; standing / 4 rounds toward zero
    Given the standing of "Venice" toward "Hungary" is +10 from "Same faith"
    And the soldiers of "Venice" with half its allies are between 1 and 2 times those of "Hungary"
    And the envoy of "Hungary" is a "Judge" with 7 years served
    When the envoy asks the country "Venice" for an alliance
    Then the count of "Venice" holds these reasons:
      | reason                                   | number |
      | Base (alliance)                          | -40    |
      | Standing / 4                             | 2      |
      | We share an enemy (Ottomans)             | 25     |
      | We are stronger than you                 | -10    |
      | We already have allies                   | 0      |
      | Hegemon seeker: alliance with a stronger | 0      |
      | Negotiation high                         | 10     |
    And the total is -13
    And the answer is "no"

  @DIPL-081 @DIPL-051 @DIPL-131 @placeholder
  Scenario: A gift and a Marshal turn the no into a yes
    Given the country "Hungary" sends the country "Venice" a gift of 100 gold
    Then the standing of "Venice" toward "Hungary" is +30
    When an envoy of "Hungary" who is a "Marshal" asks the country "Venice" for an alliance
    Then the total is 2
    And the answer is "yes"
    And the countries "Hungary" and "Venice" are allied

  @DIPL-081
  Scenario Outline: Over zero is yes
    Given a count totals <total>
    When the game evaluates it
    Then the answer is "<answer>"

    Examples:
      | total | answer |
      | 1     | yes    |
      | 0     | no     |
      | -1    | no     |

  @DIPL-082
  Scenario: No preview, the answer arrives a month after it is given
    Given the date is "1445-02"
    When the country "Venice" gives its answer to "Hungary"
    Then the country "Hungary" sees no answer yet
    And in "1445-03" the country "Hungary" receives a letter with the answer and every reason and number

  @DIPL-082
  Scenario: Action buttons show no number
    Given the diplomacy rules are in force
    When the player opens the country diplomacy card of "Venice"
    Then no action button shows a predicted total or any reason's number

  @DIPL-229 @placeholder
  Scenario Outline: A one-word hint before asking
    Given the count of an alliance asked of "Venice" by "Hungary" stands at <total> this month
    When the player opens the country diplomacy card of "Venice"
    Then the mission "Propose an alliance" shows the word "<word>"

    Examples:
      | total | word     |
      | 40    | Likely   |
      | 15    | Likely   |
      | 14    | Unsure   |
      | 0     | Unsure   |
      | -15   | Unlikely |
      | -40   | Unlikely |

  @DIPL-229
  Scenario: Asks that always land show no word
    Given the diplomacy rules are in force
    When the player opens the country diplomacy card of "Venice"
    Then the missions "Courtesy visit" and "Send a gift" show no word

  @DIPL-083
  Scenario Outline: What the asker can see before asking
    Given the country "Hungary" <resident> at the court of "Venice"
    When the game evaluates it
    Then the country "Hungary" sees the soldiers of "Venice" as "<seen>"
    And the country "Hungary" sees the ledger and the stance of "Venice" toward it

    Examples:
      | resident             | seen        |
      | has a resident       | exact       |
      | has no resident      | an estimate |

  @DIPL-084 @placeholder
  Scenario Outline: Ruler traits add reasons
    # config: reasons.ruler_traits
    Given the ruler of "B" is "<trait>"
    When the country "A" asks the country "B" for "<action>"
    Then the count holds the trait reason at <number>

    Examples:
      | trait  | action                           | number |
      | Pious  | anything, both of the same faith | 10     |
      | Warlike| swear peace                      | -10    |
      | Greedy | an alliance with a gift          | 10     |

  @DIPL-084
  Scenario: Personality rows stay within -30 to +30
    Given the diplomacy rules are in force
    When any count is made
    Then the personality reason is between -30 and +30

  @DIPL-085 @DIPL-086 @placeholder
  Scenario Outline: Strength in binding asks
    # config: reasons.strength
    Given the country "A" has <a_soldiers> soldiers and no allies
    And the country "B" has <b_soldiers> soldiers and allies who would come with <b_allies> soldiers
    When the country "A" asks the country "B" for an alliance
    Then the count holds "<reason>" at <number>

    Examples:
      | a_soldiers | b_soldiers | b_allies | reason                   | number |
      | 30000      | 10000      | 0        | You are stronger than us | 30     |
      | 90000      | 10000      | 0        | You are stronger than us | 40     |
      | 10000      | 20000      | 0        | We are stronger than you | -20    |
      | 10000      | 20000      | 20000    | We are stronger than you | -30    |
      | 5000       | 40000      | 20000    | We are stronger than you | -40    |

  @DIPL-087 @placeholder
  Scenario Outline: Strength in demands
    # config: reasons.strength.cannot_beat_you_per_multiple_beyond_1, strong_friends_factor
    Given the country "A" has <ratio> times the soldiers of the country "B"
    And the allies of "B" <defend> defend it
    When the country "A" demands a province of the country "B"
    Then the count holds "We cannot beat you" at <cannot>
    And the count holds "We have strong friends" at <friends>

    Examples:
      | ratio | defend    | cannot | friends |
      | 1     | would not | 0      | 0       |
      | 3     | would not | 30     | 0       |
      | 3     | would     | 30     | -15     |
      | 6     | would not | 60     | 0       |

  @DIPL-088
  Scenario Outline: Already at war
    Given the country "B" is at war with the country "Ottomans"
    When the country "A" asks the country "B" for a new commitment against "<enemy>"
    Then the count holds "We are already at war" at <number>

    Examples:
      | enemy    | number |
      | Milan    | -30    |
      | Ottomans | 0      |

  @DIPL-089 @placeholder
  Scenario Outline: Distance
    # config: reasons.distance
    Given the countries "A" and "B" <border>
    And an envoy needs <days> days from "A" to "B"
    When the game evaluates it
    Then the count holds distance reasons totalling <number>

    Examples:
      | border                                       | days | number |
      | share a border                               | 20   | 0      |
      | share a neighbour                            | 40   | 0      |
      | share no border and no neighbour             | 50   | -15    |
      | share no border and no neighbour             | 61   | -30    |

  @DIPL-090 @placeholder
  Scenario: We share an enemy
    # config: reasons.share_an_enemy
    Given the countries "Hungary" and "Venice" are both at war with the country "Ottomans"
    When the game evaluates it
    Then a count between them holds "We share an enemy" at +25

  @DIPL-091 @placeholder
  Scenario: You threaten our frontier
    # config: reasons.frontier_threat_per_province
    Given the Lands taken of "A" include 3 provinces bordering the country "B"
    When the country "A" asks the country "B" for anything
    Then the count holds "You threaten our frontier" at -15

  @DIPL-092 @placeholder
  Scenario Outline: We already have allies
    # config: reasons.allies_beyond_free
    Given the country "B" has <allies> alliances
    When the game evaluates it
    Then a count made by "B" holds "We already have allies" at <number>

    Examples:
      | allies | number |
      | 1      | 0      |
      | 2      | 0      |
      | 4      | -20    |

  @DIPL-093
  Scenario: Each action adds at most two reasons of its own
    Given the diplomacy rules are in force
    When any action is counted
    Then at most two reasons beyond the common reasons belong to that action
