@context-diplomacy
Feature: Trade pacts and embargoes
  As a country
  I want to open or close my border to another's traders
  So that diplomacy shapes trade

  @DIPL-120 @placeholder
  Scenario: A trade pact
    # config: actions.trade_pact.base
    Given the countries "England" and "Hanseatic League" are not at war
    When the country "Hanseatic League" agrees to a trade pact with the country "England"
    Then their traders pay no tolls and no extra fees in each other's provinces
    And the fact "trade_agreement" exists between them
    And each ledger between them holds "Trade pact" at +10

  @DIPL-120
  Scenario Outline: A trade pact ends
    Given the countries "A" and "B" have a trade pact
    When <event>
    Then the trade pact has ended

    Examples:
      | event                                     |
      | the country "A" declares war on "B"       |
      | the country "B" cancels the pact          |

  @DIPL-121
  Scenario: An embargo
    Given the countries "Venice" and "Genoa" are not at war
    When the country "Venice" declares an embargo on the country "Genoa"
    Then the traders of "Venice" and "Genoa" may not cross each other's land or ports
    And the paths through the provinces of "Venice" are closed to the traders of "Genoa"
    And the ledger of "Genoa" toward "Venice" holds "Embargo against us" at -15 while it lasts

  @DIPL-120 @DIPL-121
  Scenario: Pacts and embargoes need peace
    Given the countries "A" and "B" are at war
    When the country "A" offers a trade pact to the country "B"
    Then the offer is refused
