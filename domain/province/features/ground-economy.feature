@context-province
Feature: Ground effects on buildings and people
  As a player
  I want the ground to decide how much a building is worth compared with people working bare land
  So that settled and herding peoples play differently

  @PROV-050 @placeholder
  Scenario Outline: Build cost, building output and people output by ground
    # config: province.ground.economy
    Given a province with the ground "<ground>"
    When the game works out the province's stats
    Then buildings cost <cost> of the base cost
    And building output is <building>
    And people output without a building is <people>

    Examples:
      | ground    | cost  | building                                | people                         |
      | farmland  | 100 % | +25 %                                   | 100 %                          |
      | grassland | 100 % | 100 %                                   | +50 % for herding              |
      | savanna   | 100 % | 100 %                                   | +25 % for herding              |
      | drylands  | 125 % | −25 % until irrigated                   | 100 %                          |
      | desert    | 150 % | −50 % except mines and irrigation works | 100 % for herding and caravans |
      | hills     | 125 % | 100 % (mines +25 %)                     | 100 %                          |
      | mountains | 200 % | −50 % for farms, +50 % for mines        | −25 %                          |
      | forest    | 150 % | 100 % (lumber +50 %)                    | +25 % for hunting and gathering |
      | jungle    | 200 % | −25 %                                   | +25 % for gathering            |
      | marsh     | 200 % | −50 % until drained                     | +25 % for fishing              |
      | tundra    | 150 % | −50 %                                   | 100 % for herding (reindeer)   |

  @PROV-051 @placeholder
  Scenario Outline: Irrigation and draining lift the building penalty
    Given a province with the ground "<ground>"
    When the tile is <work>
    Then building output there is no longer <penalty>

    Examples:
      | ground   | work      | penalty |
      | drylands | irrigated | −25 %   |
      | marsh    | drained   | −50 %   |

  @PROV-052 @placeholder
  Scenario Outline: In the desert only mines and irrigation works escape the penalty
    Given a province with the ground "desert"
    When the game works out the province's stats
    Then a <building> works at <output>

    Examples:
      | building          | output |
      | farm              | −50 %  |
      | mine              | 100 %  |
      | irrigation works  | 100 %  |

  @PROV-053 @placeholder
  Scenario Outline: Some grounds favour one kind of building
    Given a province with the ground "<ground>"
    When the game works out the province's stats
    Then a <building> works at <output>

    Examples:
      | ground    | building    | output |
      | hills     | mine        | +25 %  |
      | mountains | farm        | −50 %  |
      | mountains | mine        | +50 %  |
      | forest    | lumber camp | +50 %  |
