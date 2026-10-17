@context-trade
Feature: Trade value
  As the game
  I want each province's trade value to come from what it makes and its buildings
  So that rich craft towns are worth more to traders

  @TRADE-024 @TRADE-025 @placeholder
  Scenario: Trade value from goods and buildings
    Given the province "Troyes" makes 30 cloth and 40 wool a year
    And it has a yearly fair and 3 working loom houses
    When its trade value is worked out
    Then its goods value is 230 gold a year
    And its building weights are 0.65
    And its trade value is about 31.6 gold a month

  @TRADE-026
  Scenario: Burned tiles and eaten food make nothing
    Given the province "Champagne" has 2 burned fields
    And it eats most of its grain and stores a surplus of 100 grain
    When the trade rules are applied
    Then only the 100 grain surplus counts toward goods value
    And the burned fields add nothing

  @TRADE-027 @placeholder
  Scenario Outline: Price per load by tier
    Given the trade config of the design
    When the trade rules are applied
    Then a load of "<ware>" is worth <price> gold

    Examples:
      | ware    | price |
      | grain   | 1     |
      | wool    | 2     |
      | cloth   | 5     |
      | silk    | 10    |
      | pepper  | 10    |
      | silver  | 12    |

  @TRADE-028 @placeholder
  Scenario: Silver falls after the silver flood
    # config: value.silver_after_flood
    Given silver is worth 12 gold a load
    When the event tree's silver flood happens
    Then silver is worth 6 gold a load

  @TRADE-029 @placeholder
  Scenario Outline: Building weights
    Given the province "<province>" has a "<building>"
    When the trade rules are applied
    Then the building adds <weight> to its building weights <applies>

    Examples:
      | province | building        | weight | applies               |
      | Troyes   | weekly market   | 0.25   | for every trader      |
      | Troyes   | yearly fair     | 0.50   | for every trader      |
      | Bruges   | trading house   | 1.00   | for every trader      |
      | Aleppo   | caravanserai    | 0.25   | for land traders only |
      | Troyes   | warehouse       | 0.25   | for every trader      |
      | Lisbon   | harbour         | 0.25   | for ships only        |
      | Florence | counting house  | 0.10   | for every trader      |
      | Genoa    | bank            | 0.25   | for every trader      |
      | Troyes   | loom house      | 0.05   | for every trader      |

  @TRADE-030
  Scenario: A province without a market
    Given the province "Langres" is a village with no market
    When the trade rules are applied
    Then it still has a trade value
    And it gets busier when traders pass
    And it pays traders who walk through it
    But it cannot be a route stop

  @TRADE-026 @TRADE-126
  Scenario Outline: What the food surplus is
    Given the province "Champagne" grows <made> grain this year and its people eat <eaten>
    And its food store is <store>
    When the trade rules are applied
    Then <surplus> grain counts toward goods value

    Examples:
      | made | eaten | store    | surplus |
      | 900  | 800   | half full | 100    |
      | 900  | 800   | full     | 100     |
      | 700  | 800   | empty    | 0       |
