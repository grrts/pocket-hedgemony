@context-province
Feature: Wares from tiles
  As the game
  I want every non-food ware to be made by workers in buildings
  So that wares follow people, ground and inventions

  @PROV-090
  Scenario: Wares are made by workers times ground times inventions
    Given the province "Potosí" has the ground "mountains"
    And the province "Potosí" has a full silver mine with 6,000 miners
    When the year's wares are worked out
    Then the mine makes silver for 6,000 miners at +50 % building output and the country's mining inventions

  @PROV-091 @placeholder
  Scenario: Finished wares are worth more than raw ones
    # config: province.wares.craft_value
    Given the province "Troyes" turns wool into cloth in a loom house
    When the game works out the province's stats
    Then the cloth is worth three times the wool

  @PROV-092
  Scenario Outline: Wares fall when work or inputs fail
    Given the province "Troyes" makes tools in a forge
    When <cause>
    Then the province "Troyes" makes <result>

    Examples:
      | cause                               | result                    |
      | no iron arrives                     | no tools                  |
      | plague kills half the craftsmen     | fewer tools               |
      | the forge's town is sacked          | no tools                  |

  @PROV-093
  Scenario: The ware list lives in config and grows in later eras
    Given the ware list in the province config
    When the game works out the province's stats
    Then it includes grain, cloth, iron, silver, spices, saltpetre and powder
    And later eras add coal, rubber and oil

  @PROV-094
  Scenario: Enslaved people are never a ware
    Given the ware list in the province config
    When the game works out the province's stats
    Then no ware stands for enslaved people
