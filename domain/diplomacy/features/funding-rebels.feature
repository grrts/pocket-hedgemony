@context-diplomacy
Feature: Funding rebels
  As a country
  I want to secretly stir up a province of another country
  So that I can weaken a rival, at the risk of being caught

  @DIPL-134 @placeholder
  Scenario Outline: What funding needs
    # config: actions.fund_rebels.gold_per_month_choices
    Given the country "Milan" has a free envoy seat
    And the country "Venice" <relation> the country "Milan"
    When the country "Milan" funds rebels in a province of "Venice" with <gold> gold a month
    Then the funding is <result>

    Examples:
      | relation        | gold | result  |
      | is a rival of   | 25   | started |
      | is a rival of   | 30   | refused |
      | is an ally of   | 25   | refused |
      | is a subject of | 10   | refused |

  @DIPL-134
  Scenario: Funding is secret
    Given the diplomacy rules are in force
    When the country "Milan" funds rebels in the province "Bergamo" of "Venice"
    Then the country "Venice" is told nothing

  @DIPL-135 @placeholder
  Scenario Outline: What funding does
    # config: actions.fund_rebels
    Given the country "Milan" funds the province "Bergamo" of "Venice" with <gold> gold a month
    When the game evaluates it
    Then the province "Bergamo" has the grievance "Foreign agitators"
    And riots in "Bergamo" need one grievance fewer
    And rebels in "Bergamo" count as Armed and do not shrink while left to wait
    And the province "Bergamo" <sign> a sign for the revolution camp of "Venice"

    Examples:
      | gold | sign           |
      | 25   | is not         |
      | 50   | is             |

  @DIPL-136
  Scenario: Funding an émigré pretender
    Given an émigré court of the old dynasty of "France" sits in "Austria"
    When the country "Austria" funds it
    Then it is funded under the same rules as rebels

  @DIPL-137 @placeholder
  Scenario Outline: The chance of being caught
    # config: actions.fund_rebels.caught_chance_per_turn
    Given the funded province is <run_by>
    When the game evaluates it
    Then each turn the chance of being caught is <chance>

    Examples:
      | run_by                 | chance  |
      | run by a Steward       | 1 in 10 |
      | run by a Judge         | 1 in 5  |
      | held by a lord         | 1 in 20 |

  @DIPL-138 @placeholder
  Scenario: Caught
    # config: actions.fund_rebels.on_caught
    Given the date is "1460-04"
    When the funding of "Milan" in "Bergamo" of "Venice" is caught
    Then the envoy of "Milan" is held and the funding stops
    And the ledger of "Venice" toward "Milan" holds "Stirred revolt in our land" at -50 fading over 20 years
    And the country "Venice" holds the war aim "Punish" against "Milan" until "1465-04"
    And every lord and royal province of "Venice" that hears of it has the grievance "Foreign meddling" until "1461-04"
    And the country "Milan" learns it was caught in "1460-05"
