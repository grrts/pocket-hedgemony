@context-diplomacy
Feature: Diplomacy AI
  As an AI country
  I want to use the same counts and limits as the player
  So that the player can read exactly why I act and answer as I do

  @DIPL-177 @placeholder
  Scenario Outline: Posture rows
    # config: ai.posture
    Given the AI country "B" has posture "<posture>"
    When <ask>
    Then the count of "B" holds the posture reason at <number>

    Examples:
      | posture        | ask                                                              | number |
      | mixed          | a country asks "B" for an alliance                               | 0      |
      | bandwagoner    | a stronger country asks "B" for an alliance                      | 20     |
      | bandwagoner    | "B" counts a league against a country with 2 times its soldiers  | -20    |
      | opportunist    | "B" is called to a war on the side with more soldiers            | 20     |
      | opportunist    | "B" gets a defensive call where the enemy is stronger            | -20    |
      | isolationist   | a country asks "B" for an alliance                               | -30    |
      | isolationist   | a country asks "B" to swear peace                                | 20     |
      | isolationist   | a country asks "B" for a trade pact                              | 20     |
      | isolationist   | a country asks "B" for passage                                   | -20    |
      | balancer       | "B" counts a league against a country with 3 times its soldiers  | 30     |
      | balancer       | a country asks "B" for an alliance against its strongest neighbour | 20   |
      | client seeker  | a stronger Warm country offers "B" overlordship                  | 30     |
      | hegemon seeker | a stronger country asks "B" for an alliance                      | -20    |

  @DIPL-177 @placeholder
  Scenario: Opportunists weigh broken oaths lightly
    # config: ai.posture.opportunist.own_view_per_oath_broken
    Given the AI country "B" is an "opportunist"
    And the country "A" has broken 2 oaths
    When the country "A" asks the country "B" for an alliance
    Then the count holds "Oaths broken" at -10

  @DIPL-177 @placeholder
  Scenario Outline: Negotiation level
    # config: ai.negotiation
    Given the AI country "B" has negotiation "<level>"
    When a country asks "B" for <ask>
    Then the count holds the negotiation reason at <number>

    Examples:
      | level     | ask          | number |
      | very high | a trade pact | 15     |
      | very high | a demand     | 0      |
      | high      | an alliance  | 10     |
      | moderate  | an alliance  | 0      |
      | low       | an alliance  | -10    |
      | very low  | an alliance  | -20    |

  @DIPL-177 @placeholder
  Scenario: Very high negotiators value gifts more
    # config: ai.negotiation.very_high_gift_multiplier
    Given the AI country "B" has negotiation "very high"
    When the country "A" sends "B" a gift of 100 gold
    Then the gift counts as 125 gold

  @DIPL-178 @placeholder
  Scenario: Candidate actions within the horizon
    # config: ai.horizon, ai.candidates_per_free_seat
    Given the AI country "Ottomans" has 1 free envoy seat
    When the AI turn runs
    Then the "Ottomans" score at most 5 candidate actions
    And every candidate targets a neighbour, a neighbour's neighbour, a country it holds a relation or fact with, or an enemy of its rivals

  @DIPL-179 @placeholder
  Scenario Outline: The AI sends its best estimated yes, or a gift first
    # config: ai.gift_first_if_total_at_least
    Given the best candidate of the AI country "A" has an estimated total of <estimate>
    When the AI turn runs
    Then the AI country "A" <does>

    Examples:
      | estimate | does                                    |
      | 12       | sends that request                      |
      | -15      | sends a gift first                      |
      | -20      | sends a gift first                      |
      | -25      | sends nothing for it                    |

  @DIPL-179
  Scenario: The AI estimates under the player's limits
    Given the AI country "Ottomans" has no resident in "Venice"
    When the "Ottomans" estimate a count of "Venice"
    Then they use an estimate of the soldiers of "Venice", not the exact number

  @DIPL-180
  Scenario Outline: A demand before war
    Given the AI country "A" with posture "<posture>" holds an aim against "B" that a demand fits
    And the armies of "B" are <armies>
    When the AI country "A" decides to go to war with "B"
    Then the AI country "A" <first>

    Examples:
      | posture        | armies   | first                         |
      | hegemon seeker | at home  | sends the demand first        |
      | opportunist    | at home  | sends the demand first        |
      | opportunist    | away     | declares war without a demand |

  @DIPL-181
  Scenario: The AI answers the player with the same count
    Given the diplomacy rules are in force
    When the player's envoy asks the AI country "Venice" for an alliance
    Then "Venice" answers with exactly the reasons count of the rules
    And the player reads the reasons when the answer arrives

  @DIPL-182
  Scenario Outline: Who funds rebels
    Given the AI country "A" has posture "<posture>", a free seat and gold to spare
    And the revolution card of its rival "B" shows <signs> signs
    When the AI turn runs
    Then the AI country "A" <does> fund rebels there

    Examples:
      | posture        | signs | does     |
      | opportunist    | 1     | may      |
      | hegemon seeker | 2     | may      |
      | opportunist    | 0     | does not |
      | balancer       | 2     | does not |
