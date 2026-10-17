@context-province
Feature: Homeless people
  As the game
  I want people with no slot to bring trouble that grows with their share
  So that overcrowding is visible and fixable

  @PROV-120 @placeholder
  Scenario: Homeless eat, make nothing, pay nothing and die fast
    # config: province.homeless.deaths
    Given the province "Troyes" has 3,600 homeless
    When the game works out the province's stats
    Then they eat from the local store
    And they make nothing and pay no tax
    And their death rate is 5 % a year

  @PROV-121 @placeholder
  Scenario Outline: Theft and begging cut tax and trade
    # config: province.homeless.thresholds
    Given the province "Troyes" has <share> homeless
    When the game works out the province's stats
    Then <tax> less of its tax reaches you
    And its trade ratio gain is <trade> lower

    Examples:
      | share | tax  | trade |
      | 4 %   | 0 %  | 0 %   |
      | 6 %   | 5 %  | 5 %   |
      | 11 %  | 10 % | 10 %  |
      | 16 %  | 15 % | 15 %  |

  @PROV-122 @PROV-123 @placeholder
  Scenario Outline: The Homeless grievance and shanty camps
    Given the province "Troyes" has <share> homeless
    When the game works out the province's stats
    Then the "Homeless" grievance counts as <weight>
    And shanty camps are <camps>

    Examples:
      | share | weight | camps  |
      | 9 %   | 0      | absent |
      | 12 %  | 1      | absent |
      | 22 %  | 2      | present |

  @PROV-123 @placeholder
  Scenario: Shanty camps bring plague, death and fire
    Given the province "Troyes" has shanty camps
    When the game works out the province's stats
    Then plague starts here first and spreads twice as fast
    And town classes die 1 % faster
    And each year a town building may burn

  @PROV-124
  Scenario: Rebels muster from the recruit pool
    Given the province "Troyes" has 4 grievances, of which "Heavy taxes" is the biggest
    And the province "Troyes" has 900 recruits here
    When it rises with 600 men wanted
    Then 600 of its recruits take up arms

  @PROV-125
  Scenario Outline: Ways people become homeless
    Given the province "Troyes" has no free slot
    When <cause>
    Then the province "Troyes" has more homeless

    Examples:
      | cause                                         |
      | births overflow from a full class             |
      | a farm tile burns and its people lose homes   |
      | the mine runs out and closes                  |
      | soldiers come home                            |
      | refugees settle after 2 years                 |

  @PROV-126
  Scenario Outline: Ways to get rid of homeless
    Given the province "Troyes" has 3,600 homeless
    When <action>
    Then the province "Troyes" has fewer homeless counting toward trouble

    Examples:
      | action                                                  |
      | a new building opens slots                              |
      | a burned tile is rebuilt                                |
      | an almshouse is built                                   |
      | a levy is raised                                        |
      | the country sends 2,000 of them as settlers to a colony |
      | they drift to a neighbouring province                   |
