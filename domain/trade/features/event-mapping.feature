@context-trade
Feature: Event-tree trade stats
  As the event tree
  I want my abstract trade stats to land on real trade numbers
  So that trade events keep working

  @TRADE-103 @placeholder
  Scenario: trade_power
    Given the trade config of the design
    When the modifier "spice_monopoly" gives "Portugal" trade_power +25 % for 10 years
    Then Portuguese traders collect 25 % more for 10 years

  @TRADE-104 @placeholder
  Scenario: trade_access
    Given the trade config of the design
    When an event gives the province "Alexandria" trade_access −0.2
    Then its ratio gain is 20 % lower for the duration

  @TRADE-105 @placeholder
  Scenario: world_trade_index
    Given the trade config of the design
    When the modifier "pandemic_disruption" sets world_trade_index −10 %
    Then every province's trade value is 10 % lower for the duration

  @TRADE-106 @placeholder
  Scenario: trade_index
    Given the trade income of "Venice" over the last 12 months is 60 % of its 1444-scaled reference
    When the trade rules are applied
    Then the trigger "trade_index >= 60" holds for "Venice"

  @TRADE-106 @TRADE-125 @placeholder
  Scenario Outline: trade_index against the reference of 100 gold a year
    # config: event_mapping.trade_index_reference_per_year
    Given the trade income of "<country>" over the last 12 months is <income> gold
    When the trade rules are applied
    Then its trade_index is <index>

    Examples:
      | country | income | index |
      | Venice  | 240    | 240   |
      | Hungary | 30     | 30    |

  @TRADE-107 @placeholder
  Scenario: trade_presence
    Given traders of "Holland" took 30 % of all collections in the Amsterdam hub's provinces over the last 12 months
    When the trade rules are applied
    Then the trigger trade_presence with who "Holland", hub "amsterdam" and value 0.3 holds

  @TRADE-108
  Scenario Outline: trade_route
    Given the trade config of the design
    When the effect "<effect>" applies trade_route from "<from>" to "<to>" with open <open>
    Then <result>

    Examples:
      | effect                 | from   | to      | open  | result                                                       |
      | portuguese_cape_route  | lisbon | malabar | true  | the sea zones round the Cape become known to "Portugal"      |
      | canal_closed_in_war    | suez   | red_sea | false | the link is marked closed for route planning                 |

  @TRADE-109
  Scenario: Hubs are labels only
    Given the hub "malacca_strait" is a named set of provinces and sea zones
    When the trade rules are applied
    Then no trader may route to the hub
    And triggers may read it
    And trade_good is read as the wares made in the province
