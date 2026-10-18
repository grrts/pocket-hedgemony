@context-trade
Feature: Risks on the road and at sea
  As a trader
  I want to know what can take my purse
  So that bringing gold home is a real choice

  @TRADE-078
  Scenario Outline: Meeting an enemy army
    Given a French caravan with 6 gold meets a Burgundian army in "Langres"
    And "France" and "Burgundy" are at war
    And the caravan <can_step> back the way it came that day
    When the trade rules are applied
    Then <result>

    Examples:
      | can_step | result                                                               |
      | cannot   | its purse goes to "Burgundy" and the caravan is captured             |
      | can      | it steps back and keeps its purse                                    |

  @TRADE-079
  Scenario: Waiting and going round
    Given a French caravan sees a Burgundian army ahead on its path
    When the trade rules are applied
    Then by default it waits a day and goes round if it can

  @TRADE-080 @placeholder
  Scenario: An army on Raid
    Given a Burgundian army on Raid passes a French caravan
    When the trade rules are applied
    Then the caravan loses its purse
    And it escapes half the time

  @TRADE-081 @placeholder
  Scenario Outline: Bandits
    Given the province "Dijon" has <trouble>
    And it <guard>
    And the owner <knows> "T1 Caravanserai networks"
    When the trade rules are applied
    Then a land trader there has a chance of <chance> a month of losing its purse

    Examples:
      | trouble          | guard                          | knows        | chance |
      | riots            | has no caravanserai or castle  | doesn't know | 0.05   |
      | 25 % homeless    | has no caravanserai or castle  | knows        | 0.025  |
      | rebels           | has a caravanserai             | doesn't know | 0      |
      | riots            | has a garrisoned castle        | doesn't know | 0      |
      | 10 % homeless    | has no caravanserai or castle  | doesn't know | 0      |

  @TRADE-082
  Scenario: Rebels act as an enemy army
    Given rebels hold "Orléans"
    When a French caravan enters "Orléans"
    Then it is treated as meeting an enemy army

  @TRADE-083
  Scenario: Traders carry plague
    Given a caravan passes through an outbreak in "Genoa"
    When the trade rules are applied
    Then it carries plague onward

  @TRADE-084 @TRADE-085
  Scenario Outline: Hunting and escort
    Given an Ottoman fleet hunts in the "Aegean"
    And Venetian warships <escort> in the "Aegean"
    When a Venetian trade ship sails through the "Aegean"
    Then <result>

    Examples:
      | escort        | result                                         |
      | do not escort | the ship and its purse are captured            |
      | escort        | the ship is protected until the escort is beaten |

  @TRADE-084
  Scenario: Routes avoid hunting zones
    Given an enemy fleet hunts in the "Aegean"
    When the trade rules are applied
    Then Venetian trade routes avoid the "Aegean" if they can

  @TRADE-086 @placeholder
  Scenario Outline: Storm losses
    Given a trade ship with 40 gold in its purse is lost in a storm
    And its owner <knows> "T11 Marine insurance"
    When the trade rules are applied
    Then <refund> gold is refunded

    Examples:
      | knows        | refund |
      | doesn't know | 0      |
      | knows        | 20     |

  @TRADE-087
  Scenario: Pirates
    Given the naval design adds a pirate fleet in the "Strait of Malacca"
    When the trade rules are applied
    Then it acts as a hunting fleet with no country
