@context-trade
Feature: Traders and trade ships
  As a country
  I want to found, keep and lose trader units I steer
  So that trade is carried by things I can count and point at

  @TRADE-001 @TRADE-100
  Scenario: The trader card
    Given the country "France" has a pack caravan "Caravan of Troyes" with 50 market folk
    And its route is "Troyes ▸ Dijon ▸ Geneva ▸ Dijon ▸ Troyes" on a loop of 38 days
    And it is in "Langres" on day 12 of 15 to "Dijon"
    And its purse holds 6.1 of 10 gold
    When the player opens the trader card
    Then the card shows kind, crew, route, loop days, position, purse, last collections, fees and tolls, danger and an upkeep of 0.5 gold a month

  @TRADE-002
  Scenario: A trader without a route goes home
    Given the caravan "Caravan of Troyes" has home city "Troyes" and no route
    When the day loop runs
    Then the caravan heads for "Troyes"

  @TRADE-003 @TRADE-012 @placeholder @open-question
  # OQ-TRADE-2: yearly fair, market, or trading post?
  Scenario: Founding a pack caravan
    Given the province "Troyes" has a yearly fair with 2400 market folk
    And the country "France" has 100 gold
    When "France" founds a pack caravan in "Troyes"
    Then "France" pays 15 gold up front
    And 50 market folk leave the fair's job slots to crew it

  @TRADE-004
  Scenario Outline: Gaining a trade ship
    Given the country "Portugal" has a port "Lisbon" with enough sailors
    When "Portugal" <action>
    Then it has a trade ship

    Examples:
      | action                                         |
      | buys a carrack in "Lisbon" and sets it to Trade |
      | turns a cog it owns to trade                    |

  @TRADE-005
  Scenario Outline: Other ways to gain a trader
    Given the trade config of the design
    When <way>
    Then the country "France" has one more trader

    Examples:
      | way                                                                 |
      | a French army takes a Burgundian caravan and keeps it               |
      | a lord of "France" gifts a caravan to the crown                     |
      | an event gives "France" a trader                                    |

  @TRADE-006
  Scenario: Dismissing a trader
    Given the caravan "Caravan of Troyes" has a crew of 50 market folk
    When the player dismisses it
    Then the caravan is gone
    And its 50 market folk overflow into the emptiest slots of "Troyes"

  @TRADE-007 @TRADE-008 @placeholder
  Scenario Outline: Upkeep and unpaid upkeep
    Given the caravan "Caravan of Troyes" has an empty purse and no route
    And its upkeep has been unpaid for <months> months
    When the trade rules are applied
    Then the caravan <state>

    Examples:
      | months | state                                   |
      | 0      | still costs 0.5 gold a month            |
      | 5      | still exists                            |
      | 6      | is gone and its crew leave              |

  @TRADE-009
  Scenario: No cap on traders
    Given the country "Venice" has 40 traders
    When "Venice" founds another trader with gold and market folk to spare
    Then it has 41 traders

  @TRADE-010
  Scenario: Pressing a trade ship into war
    Given the cog "San Marco" is a Venetian trade ship with 12 gold in its purse
    When "Venice" presses it into war
    Then it stops trading
    And it keeps its 12 gold until it next reaches a Venetian port

  @TRADE-011
  Scenario: A lord's traders
    Given the lord "Duke of Burgundy" runs a caravan from "Dijon"
    When the caravan deposits
    Then the gold goes to the lord's wealth
    And the crown can see the caravan but cannot steer it
