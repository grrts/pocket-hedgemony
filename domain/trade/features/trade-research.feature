@context-trade
Feature: Research effects on trade
  As a country
  I want trade inventions to change my traders
  So that research pays off on the road and at sea

  @TRADE-101 @placeholder @open-question
  # OQ-TRADE-3: T6 and the yearly fair
  Scenario Outline: Invention effects
    Given the country "Venice" knows "<invention>"
    When the trade rules are applied
    Then <effect>

    Examples:
      | invention                         | effect                                                          |
      | T1 Caravanserai networks          | camel caravans can be founded and bandits strike half as often  |
      | T2 Double-entry bookkeeping       | collections are 10 % higher                                     |
      | T3 Bills of exchange              | traders may deposit abroad                                      |
      | T5 Monsoon sailing calendars      | trade ships' Indian Ocean storm losses are halved               |
      | T6 Merchant fairs and exchanges   | the yearly fair can be built and every market serves 2 more visits a month |
      | T8 Licensed trading companies     | overseas trading posts count as cities and can found traders    |
      | T9 Joint-stock finance            | trade ships cost 25 % less to buy                               |
      | T11 Marine insurance              | half the purse of a lost ship is refunded                       |
      | T13 Commodity exchanges           | every known province's trade value and ratio is visible         |
      | S2 Lateen and junk rigging        | trade ships' hold is 0.5 higher                                 |
      | S13 Steamships                    | steamer trade ships can be used                                 |
      | B2 Roads and post stations        | land traders move faster, as armies do                          |

  @TRADE-102
  Scenario: Container shipping is out of scope
    Given the trade config of the design
    When the trade rules are applied
    Then "T17 Container shipping" has no effect on trade before 31 August 1939
