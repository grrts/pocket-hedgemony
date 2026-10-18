@context-trade
Feature: Deposits and trade income
  As a country
  I want my traders to empty their purses into my treasury in my own cities
  So that gold collected far away becomes gold I have

  @TRADE-060
  Scenario: Depositing in an own city
    Given the caravan "Caravan of Troyes" has 6.1 gold in its purse
    When it enters "Troyes", a city of "France"
    Then 6.1 gold goes to the treasury of "France" that day
    And the turn report says "Caravan of Troyes brought 6.1 gold to Troyes."

  @TRADE-060
  Scenario: Depositing in a city walked through
    Given a French caravan with 4 gold walks through "Lyon", a French city that is not a stop
    When the trade rules are applied
    Then it deposits 4 gold in "Lyon"

  @TRADE-061
  Scenario: A lord's city counts as the crown's
    Given the city "Dijon" belongs to the lord "Duke of Burgundy", a lord of "France"
    When a crown caravan with 5 gold enters "Dijon"
    Then 5 gold goes to the treasury of "France"
    And the lord takes no fee

  @TRADE-062 @TRADE-063
  Scenario Outline: No deposit
    Given a French caravan with 5 gold enters "<city>"
    And "<city>" is <state>
    When the trade rules are applied
    Then the caravan deposits nothing there

    Examples:
      | city      | state                                 |
      | Avignon   | a city of a subject of "France"       |
      | Rouen     | a French city occupied by "England"   |

  @TRADE-064
  Scenario: Trade income
    Given this year the traders of "France" deposited 120 gold
    And foreign traders paid "France" 15 gold in market fees
    And toll points of "France" took 10 gold
    When the trade rules are applied
    Then the trade income of "France" this year is 145 gold

  @TRADE-065 @placeholder
  Scenario Outline: Bills of exchange
    Given the country "Florence" <knows> "T3 Bills of exchange"
    And the city "Bruges" of "Burgundy" has a counting house
    And "Florence" is <relation> with "Burgundy"
    When a Florentine trader with 20 gold enters "Bruges"
    Then <result>

    Examples:
      | knows        | relation   | result                                                     |
      | knows        | at peace   | 18 gold reach the treasury of "Florence" and 2 go to "Burgundy" |
      | doesn't know | at peace   | nothing is deposited                                       |
      | knows        | at war     | nothing is deposited                                       |

  @TRADE-128 @placeholder
  Scenario: A heritage lever on deposits
    # X-6: trader_gain_pct is a percentage on each deposit
    Given the country "Venice" has the heritage lever trader_gain_pct +10
    And a Venetian caravan "Caravan of Venice" has 20 gold in its purse
    When it enters "Venice", a city of "Venice"
    Then 22 gold goes to the treasury of "Venice"
