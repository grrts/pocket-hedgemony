@context-trade
Feature: Other effects of trade
  As the game
  I want busy provinces to pay more tax, grow crafts and feed buildings
  So that letting traders through pays twice

  @TRADE-088 @placeholder
  Scenario Outline: Tax from trade ratio
    Given the province "Troyes" has a trade ratio of <ratio>
    When the trade rules are applied
    Then tax owed in "Troyes" is raised by <tax>

    Examples:
      | ratio | tax   |
      | 0     | 0 %   |
      | 40    | 10 %  |
      | 80    | 20 %  |

  @TRADE-089 @placeholder
  Scenario Outline: Crafts appear only where trade is busy
    Given the province "Troyes" has a trade ratio of <ratio>
    When the trade rules are applied
    Then craft buildings <can> appear there by themselves

    Examples:
      | ratio | can     |
      | 29    | cannot  |
      | 30    | can     |

  @TRADE-090 @placeholder
  Scenario Outline: Inputs from reach or along routes
    Given the province "Troyes" has a forge and makes no iron
    And <source>
    When the trade rules are applied
    Then the forge works at <output>

    Examples:
      | source                                                              | output |
      | a province one ring away makes iron                                 | full   |
      | a trader's route passing through "Troyes" passes a province making iron | full   |
      | no province in reach or on a passing route makes iron               | half   |

  @TRADE-091
  Scenario: Trade partners for research
    Given Venetian traders collect in Ottoman cities
    When the trade rules are applied
    Then "Venice" counts "Ottoman" as a trade partner for research spread

  @TRADE-092
  Scenario: Traders carry no food
    Given the city "Paris" is hungry
    When the trade rules are applied
    Then no trader carries grain to "Paris"
    And it is fed by the castle and food system
