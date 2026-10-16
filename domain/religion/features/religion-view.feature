@context-religion
Feature: Seeing faith
  As a player
  I want the Faith line, the Faith row and the Faith lens to show every faith, pull and community
  So that I can point at why my provinces change faith

  @RELG-116
  Scenario: The province card's Faith line
    Given the province "Rouen" is catholic 61 % falling, protestant 37 % rising and jewish 2 %
    When the player taps its Faith line
    Then it lists the pulls this year for each faith with their sources
    And it shows the protestant community as served by its own church and Tolerated
    And it shows the jewish 2 % as below a community, with no grievance
    And it shows how fast the mix is moving and toward which faith

  @RELG-117
  Scenario: The country card's Faith row
    Given the country "France" is catholic with 78 % of its people catholic, 3 more faiths, 2 preachers and no holy place
    Then the Faith row shows "Catholic · 78 % of people · 3 more faiths · 2 preachers · holds no holy place"
    When the player taps it
    Then the Faith policy screen opens

  @RELG-118
  Scenario Outline: The Faith lens
    When the map is at <zoom>
    Then it shows <what>

    Examples:
      | zoom   | what                                                                                       |
      | world  | each province in its majority faith's colour, hatched where another faith's community is 30 % or more, with holy place icons |
      | region | houses of worship as town sprites, preachers as walking figures, active waves as a spreading tint |
      | local  | the Faith line on the province card with its pulls                                         |
