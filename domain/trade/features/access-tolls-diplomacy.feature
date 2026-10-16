@context-trade
Feature: Who may go where, tolls and diplomacy
  As a country
  I want clear rules for where traders may go and what they pay
  So that borders, tolls and treaties shape trade

  @TRADE-066 @TRADE-067 @TRADE-068 @TRADE-069
  Scenario Outline: May enter
    Given a <trader> of "France"
    When the trade rules are applied
    Then it <may> enter <place>

    Examples:
      | trader        | may     | place                                         |
      | land trader   | may     | a province of a French lord                    |
      | land trader   | may     | a province of a subject of "France"            |
      | land trader   | may     | a province of "Savoy" at peace with "France"   |
      | land trader   | may not | a province of "England" at war with "France"   |
      | land trader   | may not | a quarantined province                         |
      | land trader   | may     | unclaimed land, collecting nothing there       |
      | land trader   | may not | a sea zone                                     |
      | trade ship    | may     | a port of "Portugal" at peace with "France"    |
      | trade ship    | may not | a sea zone unknown to "France"                 |

  @TRADE-068
  Scenario: Unclaimed land with a trading post
    Given unclaimed land has a trading post
    When a trader enters it
    Then the trader may collect there

  @TRADE-070
  Scenario: No passage needed
    Given "France" has no passage through "Savoy"
    And "France" and "Savoy" are at peace
    When the trade rules are applied
    Then French traders may cross into "Savoy"

  @TRADE-071 @placeholder
  Scenario Outline: Tolls from the purse
    Given the "Jura" pass has a toll rate "<rate>" set by its owner
    When a caravan passes the "Jura" pass
    Then it pays <toll> from its purse

    Examples:
      | rate | toll              |
      | none | nothing           |
      | low  | 0.2 gold          |
      | high | more than at low  |

  @TRADE-072
  Scenario: Trade pact
    Given "Venice" and "Milan" have a trade pact
    When the trade rules are applied
    Then Venetian traders pay no market fee and no toll in "Milan"
    And Milanese traders pay none in "Venice"

  @TRADE-073
  Scenario: Embargo
    Given "Castile" embargoes "Portugal"
    When the trade rules are applied
    Then Portuguese traders may neither enter nor stop in Castilian provinces or ports

  @TRADE-074 @open-question
  # OQ-TRADE-8: diplomacy may not have closed borders
  Scenario: Closed borders
    Given "Ming" has closed its borders to "Japan"
    When the trade rules are applied
    Then Japanese land traders may not enter Ming provinces
    But Japanese trade ships are not stopped by the closed borders

  @TRADE-075
  Scenario: Traders caught inside when war starts
    Given a French caravan is in "Flanders"
    When "England" and "France" go to war while "Flanders" is English
    Then the caravan heads at once for the nearest own or neutral city
    And it may be caught on the way

  @TRADE-076 @placeholder
  Scenario: Open the roads
    Given "France" won a peace with the term "Open the roads" against "Burgundy" in 1453
    When the trade rules are applied
    Then French traders pay no tolls in Burgundian provinces until 1463

  @TRADE-077
  Scenario: Tributaries pay no toll in the overlord's cities
    Given "Ryukyu" is a tributary of "Ming"
    When the trade rules are applied
    Then Ryukyuan traders pay no toll in Ming cities
    And they deposit into the treasury of "Ryukyu"
