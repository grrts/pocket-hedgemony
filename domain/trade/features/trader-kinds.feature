@context-trade
Feature: Kinds of trader
  As a country
  I want traders suited to land, river, road, rail and sea
  So that the kind fits the route

  @TRADE-013 @placeholder
  Scenario Outline: Land kinds
    Given the trade config of the design
    When the trade rules are applied
    Then a "<kind>" has era <era>, hold <hold>, purse <purse>, crew <crew>, founding cost <found> and upkeep <upkeep> a month

    Examples:
      | kind          | era | hold | purse | crew              | found | upkeep |
      | pack caravan  | I   | 1    | 10    | 50 market folk    | 15    | 0.5    |
      | camel caravan | I   | 1.5  | 15    | 50 market folk    | 20    | 0.6    |
      | river barge   | I   | 1.5  | 15    | 50 market folk    | 15    | 0.4    |
      | wagon train   | IV  | 2    | 25    | 80 market folk    | 30    | 0.8    |
      | rail freight  | V   | 6    | 80    | 120 craftsmen     | 80    | 2      |

  @TRADE-014 @TRADE-015 @placeholder
  Scenario Outline: Step days
    Given an army takes 10 days to cross the province "<province>"
    When a "<kind>" crosses it
    Then it takes <days> days

    Examples:
      | province  | kind          | days |
      | Champagne | pack caravan  | 7.5  |
      | Sahara    | camel caravan | 5    |
      | Champagne | camel caravan | 7.5  |
      | Champagne | wagon train   | 6    |

  @TRADE-014
  Scenario: A pass closed by snow closes to caravans
    Given the pass "Jura" is closed by snow this season
    When the trade rules are applied
    Then no caravan can use the "Jura" pass
    And traders never use march orders and have no column penalty

  @TRADE-016
  Scenario Outline: Who may found a camel caravan
    Given the country "<country>" <knows> "T1 Caravanserai networks"
    And its home province is "<ground>"
    When the trade rules are applied
    Then it <may> found a camel caravan

    Examples:
      | country  | knows        | ground   | may     |
      | Mali     | knows        | savanna  | may     |
      | France   | doesn't know | farmland | may not |
      | Morocco  | doesn't know | desert   | may     |

  @TRADE-017
  Scenario: River barges stay on their river
    Given the province "Troyes" has a shore tile on the Seine
    When "France" founds a river barge in "Troyes"
    Then the barge may only enter provinces with shore tiles on the Seine

  @TRADE-018
  Scenario: Wagon trains need turnpikes
    Given the country "Britain" knows "B9 Turnpike roads" and "London" has a paved road
    When the trade rules are applied
    Then "Britain" may found a wagon train in "London"
    And it moves only on land with at least a road

  @TRADE-019
  Scenario: Rail freight needs stations at both ends
    Given "Manchester" and "Liverpool" have rail stations and "Leeds" does not
    When the trade rules are applied
    Then rail freight may run "Manchester ▸ Liverpool"
    But not a leg to "Leeds"

  @TRADE-020 @placeholder
  Scenario Outline: Ship trade numbers
    # config: sea_traders (hold, purse); naval.ships (upkeep)
    Given the trade config of the design
    When the trade rules are applied
    Then a trading "<ship>" has hold <hold>, purse <purse> and upkeep <upkeep> a month

    Examples:
      | ship               | hold | purse | upkeep |
      | cog / junk / dhow  | 2    | 30    | 1      |
      | galley             | 2    | 25    | 2      |
      | carrack            | 3    | 50    | 3      |
      | galleon            | 3    | 60    | 8      |
      | fluyt              | 4    | 70    | 1.5    |
      | steamer            | 6    | 150   | 3      |

  @TRADE-004 @TRADE-020
  Scenario Outline: Which ships can trade
    Given the trade config of the design
    When the trade rules are applied
    Then a "<ship>" <can> be set to trade

    Examples:
      | ship     | can    |
      | cog      | can    |
      | junk     | can    |
      | galleon  | can    |
      | caravel  | cannot |

  @TRADE-021 @TRADE-022 @TRADE-023
  Scenario Outline: Ship movement limits
    Given a trade "<ship>" plans a route
    When the trade rules are applied
    Then <rule>

    Examples:
      | ship    | rule                                             |
      | cog     | it enters port provinces only                    |
      | galley  | it stays in enclosed seas                        |
      | steamer | its route needs a port with coal                 |
