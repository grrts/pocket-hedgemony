@context-province
Feature: Starting values rules
  As the game
  I want each province's 1444 state to be built from the map, catalogue, research tree and relations
  So that every campaign starts from history
  # The data itself belongs to scenario-setup.

  @PROV-280
  Scenario: The map sets the land
    Given the map gives the province "Troyes" terrain "farmland", a population, a wealth, a coast or river and a size
    When the campaign starts
    Then its tile count comes from its size
    And its ground from its terrain and its tile mix from its ground
    And its shore tiles from its coast and rivers
    And its people from its population
    And how many buildings start built, and its town size, from its wealth

  @PROV-281
  Scenario: The catalogue sets owners, lords, homelands and mixes
    Given the country catalogue names the house of Burgundy as a great house of "France"
    When the campaign starts
    Then the catalogue sets each province's owner, the provinces of each named lord, its homeland, and its faith and tongue mix
    And the country's administrative capacity decides how many royal provinces start with an official

  @PROV-282
  Scenario Outline: Other sources fill the rest
    Given the date is 1444
    When the campaign starts
    Then <source> sets <what>

    Examples:
      | source                                        | what                                                       |
      | the research tree's start inventions          | which buildings and castle and road steps exist            |
      | the region tables                             | which wares each ground makes, fever land and crops        |
      | the event-tree geography anchors              | fixed mines, toll points, castles and markets at named places such as Potosí |
      | the relations file                            | trade pacts, occupations and pretenders from 1444 wars and claims |

  @PROV-283
  Scenario: Wealth stops being live once buildings are placed
    Given the province "Troyes" starts with wealth 7
    When its starting buildings are placed
    Then wealth is no longer a live stat of "Troyes"
