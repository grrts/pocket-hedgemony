@context-diplomacy
Feature: Funding rebels
  As a country
  I want to secretly fund a revolution brewing in another country
  So that I can weaken a rival, at the risk of being caught

  @DIPL-134
  Scenario Outline: What funding needs
    Given the country "Milan" has a free envoy seat
    And the country "Venice" <relation> the country "Milan"
    And the revolution card of "Venice" shows <signs> signs
    When the country "Milan" funds rebels in "Venice"
    Then the funding is <result>

    Examples:
      | relation        | signs | result  |
      | is a rival of   | 1     | started |
      | is a rival of   | 0     | refused |
      | is an ally of   | 2     | refused |
      | is a subject of | 2     | refused |

  @DIPL-134 @placeholder
  Scenario: Funding costs 1 % of the target's yearly income a month
    # config: actions.fund_rebels.gold_share_of_target_yearly_income
    Given the country "Venice" earns 1200 gold a year and its revolution card shows 1 sign
    When the country "Milan" funds rebels in "Venice"
    Then the country "Milan" pays 12 gold each month

  @DIPL-134
  Scenario: Funding is secret
    Given the country "Venice" earns 1200 gold a year and its revolution card shows 1 sign
    When the country "Milan" funds rebels in "Venice"
    Then the country "Venice" is told nothing

  @DIPL-134 @DIPL-193
  Scenario: Stopping the funding is free and tells nobody
    Given the country "Milan" funds rebels in "Venice"
    When the country "Milan" stops the funding in "Venice"
    Then the envoy of "Milan" comes home
    And the country "Venice" is told nothing

  @DIPL-135
  Scenario: Funding sets the flag the revolutions read
    Given the country "Milan" funds rebels in "Venice"
    When the game evaluates it
    Then "Venice" carries the flag "revolution_funded"

  @DIPL-136
  Scenario: Funding an émigré pretender
    Given an émigré court of the old dynasty of "France" sits in "Austria"
    When the country "Austria" funds it
    Then it is funded under the same rules as rebels

  @DIPL-137 @placeholder
  Scenario: The chance of being caught
    # config: actions.fund_rebels.caught_chance_per_month
    Given the country "Milan" funds rebels in "Venice"
    When the game evaluates it
    Then each month the chance of being caught is 3 in 100

  @DIPL-138
  Scenario: Caught
    Given the date is "1460-04"
    When the funding of "Milan" in "Venice" is caught
    Then the envoy of "Milan" is held and the funding stops
    And the ledger of "Venice" toward "Milan" holds "Stirred revolt in our land" at -50 fading over 20 years
    And the country "Venice" holds the war aim "Punish" against "Milan" until "1465-04"
    And the country "Milan" learns it was caught in "1460-05"

  @DIPL-194 @placeholder
  Scenario Outline: A funded revolution that wins remembers its backer
    # config: ledger.ties.backed_our_revolution
    Given the country "Milan" funds rebels in "Venice"
    When the revolution in "Venice" wins with a regime <hostility> the form of rule of "Milan"
    Then the ledger of "Venice" toward "Milan" <result>

    Examples:
      | hostility       | result                                    |
      | not hostile to  | holds "Backed our revolution" at +25      |
      | hostile to      | does not hold "Backed our revolution"     |
