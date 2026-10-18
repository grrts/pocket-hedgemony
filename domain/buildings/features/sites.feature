@context-buildings
Feature: Building sites
  As a realm
  I want a limited number of sites per province
  So that building takes planning and time

  @BLD-038
  Scenario: One site per place
    Given fields tile 5 of "Troyes" has a farm site running
    When the player tries to start a second site on fields tile 5
    Then it is refused

  @BLD-039
  Scenario: Two sites per province, one land and one town
    Given the province "Troyes" has a land site and a town site running
    And no master of works is in "Troyes"
    When the player tries to start another town site in "Troyes"
    Then it is refused

  @BLD-040 @placeholder
  Scenario: A master of works adds sites and halves the months
    Given the province "Troyes" has a master of works official
    When the player starts a market needing 6 months
    Then "Troyes" may run 2 land sites and 2 town sites at once
    And the market takes 3 months

  @BLD-041
  Scenario: Lords build without using the crown's sites
    Given the lord "Duke of Burgundy" holds the province "Dijon"
    And the crown has a land site and a town site running in "Dijon"
    When the lord starts a castle step in "Dijon" with his own gold
    Then the lord's site runs as well

  @BLD-042 @placeholder
  Scenario Outline: Land sites stop in the hardest month
    Given the province "<province>" has a <climate> climate
    And it has a land site and a town site running
    When the month is <month>
    Then the land site stops for the month
    And the town site keeps going

    Examples:
      | province | climate | month               |
      | Novgorod | cold    | the coldest month   |
      | Calicut  | monsoon | the wettest month   |

  @BLD-043
  Scenario: An enemy army stops every site
    Given the country "Burgundy" is at war with "France"
    And a Burgundian army is in "Troyes"
    When the building rules are applied
    Then every site in "Troyes" is stopped

  @BLD-044
  Scenario: Occupation stops sites and the occupier may loot materials
    Given the province "Troyes" is occupied by "Burgundy"
    And a site in "Troyes" holds 30 stone
    When the building rules are applied
    Then the site is stopped
    And "Burgundy" may loot the 30 stone

  @BLD-045
  Scenario: A sacked town loses its town site
    Given the province "Troyes" has a town site running
    When "Troyes" is sacked
    Then the town site is lost

  @BLD-156 @placeholder
  Scenario: A master of works
    Given the province "Troyes" has a master of works official
    When the player starts a market costing 40 gold and 6 months
    Then it costs 30 gold and takes 3 months
    And "Troyes" may run 2 land sites and 2 town sites at once
