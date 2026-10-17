@context-buildings
Feature: What the people build themselves
  As a people without a treasury
  I want to put up simple buildings with my own labour
  So that decentralised peoples' land keeps working

  @BLD-090 @placeholder
  Scenario Outline: Village works
    Given the province "<province>" has been at peace for <peace> years
    And it has <food> months of food in store
    And it has homeless people
    And it has an empty pasture tile
    When the year ends and the village works roll of 20 % succeeds
    Then <result>

    Examples:
      | province | peace | food | result                                                   |
      | Oyo      | 5     | 4    | a step 1 ranch owned by the commons stands on the pasture |
      | Oyo      | 4     | 4    | nothing is built                                         |
      | Oyo      | 6     | 3    | nothing is built                                         |

  @BLD-091
  Scenario: A craft building appears
    Given the province "Troyes" has a market, homeless people and wool nearby
    When a craft building appears
    Then it is a loom house, tannery, kiln or brewery owned by the town or the commons
