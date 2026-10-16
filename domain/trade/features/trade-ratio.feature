@context-trade
Feature: Trade ratio
  As the game
  I want traffic of every country to make a province busier
  So that shared roads make trade go up for everyone on them

  @TRADE-031 @placeholder
  Scenario: One month's ratio change
    Given the province "Dijon" has a trade ratio of 40
    And 2 traders passed it this month
    When the month's day loop ends
    Then the ratio gain is 3.6
    And the ratio decay is 4
    And the province "Dijon" has a trade ratio of 39.6

  @TRADE-031 @placeholder
  Scenario Outline: Where traffic settles
    Given <traders> traders pass the province "Dijon" every month
    When many months pass
    Then the trade ratio of "Dijon" settles at about <ratio>

    Examples:
      | traders | ratio |
      | 1       | 23    |
      | 2       | 37    |
      | 5       | 60    |
      | 10      | 75    |
      | 20      | 86    |

  @TRADE-031 @placeholder
  Scenario: When traders stop, the ratio falls by a tenth a month
    Given the province "Dijon" has a trade ratio of 60
    When 7 months pass with no traders
    Then the trade ratio of "Dijon" is about 28.7

  @TRADE-032 @TRADE-033
  Scenario: Every trader of every country counts once per province
    Given a French caravan walks through "Langres" without stopping
    And a Burgundian caravan stops in "Langres" for 3 days
    And the French caravan enters "Langres" a second time this month
    When the trade rules are applied
    Then "Langres" counts 2 traders passing this month

  @TRADE-034 @placeholder
  Scenario: Sea lanes lift the ports along them
    Given a Venetian cog sails through the sea zone "Ionian Sea" without calling at a port
    And the ports "Corfu" and "Otranto" lie on that sea zone's coast
    When the trade rules are applied
    Then "Corfu" and "Otranto" each count half a trader passing

  @TRADE-035 @TRADE-036 @TRADE-037 @TRADE-038 @TRADE-039 @placeholder @open-question
  # OQ-TRADE-9: how modifiers combine
  Scenario Outline: Ratio gain modifiers
    Given the province "Dijon" has <condition>
    When the trade rules are applied
    Then its ratio gain is changed by <change>

    Examples:
      | condition                                     | change |
      | a customs officer                             | +15 %  |
      | a road one step better than its neighbours    | +10 %  |
      | peace for 10 years                            | +10 %  |
      | riots                                         | −50 %  |
      | 10 % homeless                                 | −5 %   |
      | 15 % homeless                                 | −10 %  |

  @TRADE-040
  Scenario: Plague quarantine
    Given the province "Geneva" has a trade ratio of 50
    When "Geneva" is put under plague quarantine
    Then its trade ratio is 0 while the quarantine lasts
    And no trader may enter "Geneva"

  @TRADE-041
  Scenario: Enemy armies and sieges stop the gain
    Given a Burgundian army besieges "Troyes" this month
    And 5 traders passed "Troyes" this month
    When the trade rules are applied
    Then "Troyes" has no ratio gain this month

  @TRADE-042
  Scenario: Blockade
    Given an enemy fleet blockades "Lisbon"
    When the trade rules are applied
    Then no trade ship may enter "Lisbon"
    And "Lisbon" gets no sea-lane gain
