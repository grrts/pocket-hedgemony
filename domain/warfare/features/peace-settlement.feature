@context-warfare
Feature: Peace settlement scoring
  As a ruler who has won a war
  I want to know how much the war lets me ask, and what each province costs
  So that I can choose my terms, and the AI answers them by the same counts I see

  # Leroy, 18 Oct (X-22). Config keys: warfare.settlement.province_cost.*, warfare.settlement.capacity_weights.*,
  # warfare.settlement.gold_per_point, warfare.settlement.surrender.*, warfare.peace.max_ceded_share

  @WAR-240 @placeholder
  Scenario Outline: What a province costs to demand
    Given a province with 100 thousand people and wealth 3 that borders the asker
    And it <has>
    When its demand cost is counted
    Then it costs <cost>

    Examples:
      | has                          | cost |
      | nothing more                 | 10   |
      | is its realm's capital       | 15   |
      | does not border the asker    | 13   |
      | has walls                    | 12   |

  @WAR-241 @placeholder
  Scenario: Capacity comes from what was won
    Given "Castile" is at war with "Portugal", whose land is worth 100
    And Castile holds land worth 40 and Portugal's capital
    And Portugal lost 3000 men in battle and Castile 1000, and Portugal has 1000 men left
    And Castile's strength is twice Portugal's and 60 in 100 of Portugal's voices say peace
    When the settlement capacity is counted
    Then Castile may ask 51

  @WAR-241
  Scenario: Nothing won, nothing to ask
    Given "Castile" is at war with "Portugal" and holds none of its land, nor won a battle
    And Castile's armies are far larger
    When the settlement capacity is counted
    Then Castile may ask nothing

  @WAR-242
  Scenario: Combining demands within the rules
    Given "Castile" holds 5 of Portugal's 14 provinces, its capital among them
    When Castile chooses its terms
    Then it may ask for at most 5 provinces, not the capital, and gold up to Portugal's treasury
    And the terms cost each province's price and a point for each 25 gold

  @WAR-243
  Scenario Outline: The AI answers a demand
    Given the war lets "Castile" ask 18 of "Portugal"
    When Castile asks for land and gold costing <asked>
    Then Portugal <answers>

    Examples:
      | asked                                   | answers                                                  |
      | 16                                      | signs                                                    |
      | 25, of which the two dearest cost 17    | offers the two dearest provinces and 25 gold instead     |
      | 10, a single province costing 10, with 9 allowed | refuses                                         |

  @WAR-244 @DIPL-195
  Scenario: The AI asks by the same counts
    Given "Portugal" is losing its war with the player and over half its voices want peace
    When the month's diplomacy runs
    Then Portugal offers the player the dearest provinces the player holds that the capacity buys, and gold with the rest

  @WAR-245 @WAR-246
  Scenario: A beaten AI surrenders
    Given the player holds all of "Portugal" and Portugal has no army left
    When the month's diplomacy runs
    Then Portugal surrenders unconditionally
    And the player may ask Portugal's whole realm value, within the peace limit

  @WAR-245 @WAR-246
  Scenario: A beaten AI surrenders to an AI victor
    Given the AI realm "Castile" holds all of "Portugal" and Portugal has no army left
    When the month's diplomacy runs
    Then Portugal surrenders unconditionally to Castile
    And Castile takes a third of Portugal's provinces, rounded up

  @WAR-247
  Scenario: A counter comes as a peace offer
    Given the player asked "Portugal" for more than the war allows
    When Portugal counters
    Then the player gets a peace offer naming the provinces and gold Portugal will give, until the month is out

  @WAR-248 @WAR-249 @WAR-250
  Scenario: The peace table
    Given the player is at war with "Portugal" and holds some of its land
    When the player opens Portugal's card on the Diplomacy tab
    Then the peace table shows what the war lets the player ask, a bar of what is asked with both numbers as text, and where the capacity comes from
    And each province held is a 44-point toggle with its price, and gold has − and + buttons
    And it reads the same on a small and a large phone held sideways and on a desktop

  @WAR-251
  Scenario: The same war always scores the same
    Given two games in the same war state
    When their peace tables are counted
    Then the costs, capacity, answers and terms are the same
