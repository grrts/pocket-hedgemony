@context-trade
Feature: Collecting
  As a trader
  I want to fill my purse in every province I enter
  So that a road through rich towns pays more than one through empty country

  @TRADE-043 @placeholder
  Scenario Outline: What a trader collects on entering
    Given the province "<province>" has a trade value of <value> gold a month and a trade ratio of <ratio>
    And it has not yet served its trader visits this month
    When a trader with hold <hold> enters "<province>"
    Then it collects <collected> gold into its purse

    Examples:
      | province | value | ratio | hold | collected |
      | Langres  | 4.0   | 40    | 1    | 0.32      |
      | Geneva   | 10.0  | 50    | 1    | 1.0       |
      | Geneva   | 10.0  | 50    | 1.5  | 1.5       |

  @TRADE-044
  Scenario: No collection when leaving or waiting
    Given a caravan is in "Langres" waiting for snow to clear
    When it waits 10 days
    Then it collects nothing more in "Langres"
    And when it leaves for "Dijon" it collects only on entering "Dijon"

  @TRADE-045
  Scenario: A full purse collects nothing
    Given a pack caravan's purse holds 10 of 10 gold
    When it enters "Geneva"
    Then it collects nothing until it deposits

  @TRADE-046
  Scenario: Ships collect only at ports
    Given a Venetian galley sails from "Venice" through the "Adriatic" to "Corfu"
    When the trade rules are applied
    Then it collects nothing in the sea zones
    And it collects on entering "Corfu"

  @TRADE-047 @placeholder
  Scenario Outline: Market fees abroad
    Given a French caravan collects 0.55 gold in "<province>" owned by "<owner>"
    And "France" and "<owner>" <pact> a trade pact
    When the trade rules are applied
    Then "<owner>" receives a market fee of <fee> gold

    Examples:
      | province | owner  | pact     | fee   |
      | Geneva   | Savoy  | lack     | 0.055 |
      | Geneva   | Savoy  | have     | 0     |
      | Troyes   | France | lack     | 0     |

  @TRADE-048 @placeholder
  Scenario Outline: Crowded provinces
    Given the province "Geneva" has a yearly fair, serving 8 visits a month
    And <before> trader visits have already been made this month
    When another trader enters "Geneva"
    Then its collection is multiplied by <factor>

    Examples:
      | before | factor |
      | 3      | 1      |
      | 7      | 1      |
      | 9      | 0.8    |
      | 15     | 0.5    |

  @TRADE-048 @placeholder
  Scenario Outline: Visits served by market step
    Given the province "Troyes" has <market>
    When the trade rules are applied
    Then it serves <visits> trader visits a month at full value

    Examples:
      | market           | visits |
      | no market        | 2      |
      | a weekly market  | 4      |
      | a yearly fair    | 8      |
      | a trading house  | 16     |
