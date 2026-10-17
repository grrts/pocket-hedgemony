@context-trade
Feature: Trade on screen
  As a player
  I want trade on the map, a Trade screen and quick controls
  So that I can run many traders with few taps

  @TRADE-093
  Scenario Outline: Trade at each zoom
    Given the trade config of the design
    When the map is at <zoom> zoom
    Then trade shows <shown>

    Examples:
      | zoom   | shown                                                                                     |
      | world  | provinces coloured by trade ratio and the busiest roads and sea lanes                     |
      | region | thicker roads with more traders, trader icons with a purse bar, a coin on market cities   |
      | local  | caravans on the road tiles, barges on the river, ships in the harbour                     |

  @TRADE-094
  Scenario: Trade lenses
    Given the trade config of the design
    When the trade rules are applied
    Then the lenses "Trade ratio", "Trade value" and "Traders" exist
    And the lenses "Traders passing" and "Trade balance" do not

  @TRADE-095
  Scenario: Founding from a city
    Given the player taps "Troyes", a French city with a market
    When the player chooses Trade, then Found a trader, then "pack caravan"
    Then a pack caravan is founded in "Troyes"

  @TRADE-096
  Scenario: Setting a route by taps
    Given the player taps a trader and chooses Route
    When the player taps "Dijon", "Geneva" and then "Geneva" again
    Then the route has the stops "Dijon" and "Geneva"
    And the preview updated after each tap
    And the route is set on Confirm

  @TRADE-097
  Scenario: Copying a route
    Given five caravans of "Venice"
    When four of them copy the first one's route
    Then all five run the same loop

  @TRADE-098
  Scenario: The Trade screen
    Given the trade config of the design
    When the player opens the Trade screen
    Then it lists every trader and trade ship with kind, route, purse, last deposit, expected gold a month and problems
    And it can be sorted by gold a month

  @TRADE-099
  Scenario: The turn report
    Given traders of "France" deposited 23 gold this month and one caravan was robbed
    When the trade rules are applied
    Then the turn report says "Traders brought 23 gold this month"
    And the robbery has its own line

  @TRADE-093 @TRADE-124
  Scenario: Busy sea lanes are counted, not given a ratio
    Given 3 Venetian cogs and 1 Genoese cog sail through the "Ionian Sea" this month
    And 1 Venetian cog sails through the "Adriatic"
    When the month ends
    Then the busiest sea lanes are the "Ionian Sea" with 4 ships and the "Adriatic" with 1
    And no sea zone has a trade ratio

  @TRADE-125 @placeholder
  Scenario Outline: Hubs as the event tree reads them
    # config: hubs
    Given the trade config of the design
    When the trade rules are applied
    Then the hub "<hub>" is <places>

    Examples:
      | hub            | places                                     |
      | bruges_antwerp | the provinces "Bruges" and "Antwerp"       |
      | malacca_strait | the province "Malacca" and the sea zone "Strait of Malacca" |
      | volga          | the provinces "Astrakhan" and "Kazan"      |
