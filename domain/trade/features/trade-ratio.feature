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

  @TRADE-035 @TRADE-036 @TRADE-037 @TRADE-038 @TRADE-039 @placeholder
  Scenario Outline: Ratio gain modifiers
    # config: ratio.modifiers
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
      | 4 % homeless                                  | 0 %    |

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

  @TRADE-118 @placeholder
  Scenario Outline: Ratio gain modifiers add together
    # config: ratio.modifiers, ratio.modifiers_combine
    Given the province "Dijon" has <conditions>
    When the trade rules are applied
    Then its ratio gain is changed by <change>

    Examples:
      | conditions                                          | change |
      | a customs officer and riots                         | −35 %  |
      | a customs officer, peace for 10 years and a better road | +35 % |
      | riots and 30 % homeless                             | −75 %  |
      | riots, 60 % homeless and a trade_access of −0.2     | −100 % |
      | a customs officer and an enemy army                 | −100 % |

  @TRADE-036 @TRADE-118
  Scenario Outline: A road better than every neighbour's
    Given the province "Dijon" has a "<own>" and its neighbours have <neighbours>
    When the trade rules are applied
    Then "Dijon" <has> the better-road bonus

    Examples:
      | own        | neighbours                 | has      |
      | paved_road | a road and a track         | has      |
      | paved_road | a paved_road and a road    | lacks    |
      | road       | a track and a track        | has      |

  @TRADE-123 @placeholder
  Scenario Outline: "Traders passing" effects of buildings and heritage
    # config: ratio.shrine_pilgrims_passing; X-6 heritage levers
    Given the province "Djenné" has a trade ratio of 40
    And 2 traders passed it this month
    And it has <effect>
    When the month's day loop ends
    Then the ratio gain is <gain>

    Examples:
      | effect                                                   | gain |
      | nothing more                                             | 3.6  |
      | a landmark giving +20 % traders passing                  | 4.32 |
      | a pilgrimage shrine whose pilgrims count as traders passing | 5.4 |
      | an owner whose heritage gives traders_passing_pct +10    | 3.96 |
      | an owner whose heritage gives trade_balance_pct +10      | 3.96 |
