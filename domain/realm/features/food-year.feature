@context-realm
Feature: A year of food
  As the game
  I want the harvest, collection, sharing, spreading and eating to run in order every year
  So that castles, roads and armies decide who eats

  @REALM-050
  Scenario: Weather is rolled by region
    Given the provinces "Troyes", "Sens" and "Auxerre" lie in one weather region
    When the autumn harvest is rolled with bad weather for that region
    Then all three suffer together
    And the grain price rises for all of them

  @REALM-051
  Scenario: Collection goes to the nearest castle in reach
    Given the province "Sens" has a surplus and lies in reach of the castles of "Troyes" and "Paris"
    And "Troyes" is the nearer
    When the collection runs
    Then the collected food goes to the castle of "Troyes"

  @REALM-052 @placeholder
  Scenario: Food moving between castles loses some of its load
    # config: food.transfer_loss_per_province (value not given: OQ-REALM-11)
    Given the castle of "Paris" holds more than its share and "Calais" less
    When the castles exchange food until each holds its share
    Then the food sent from "Paris" to "Calais" arrives with less than was sent, losing some for every province it travels

  @REALM-053
  Scenario: The spread keeps the reserve and hands out the rest by rings
    Given the castle of "Troyes" holds 10 months of food and has a siege reserve of 3 months
    When the spread runs
    Then it keeps 3 months
    And hands out the rest to the rings around it by its spread pattern

  @REALM-054 @placeholder
  Scenario: Campaigning soldiers and horses eat more
    # config: food.campaign_eat, food.horse_eats
    Given an army of 1,000 men is on campaign and a herd of 200 horses is at home
    When a month of eating passes
    Then the army eats as much as 2,000 men at home
    And the horses eat as much as 600 men

  @REALM-054
  Scenario: Stores rot each season, less with granaries
    Given the castles of "Troyes" and "Sens" hold the same food and only "Troyes" has a granary
    When a season passes
    Then both lose some food to rot
    And "Troyes" loses less

  @REALM-055
  Scenario: A besieged castle stops spreading
    Given the castle of "Calais" is besieged
    When the spread runs
    Then the castle of "Calais" hands out nothing
    And it lives on its own store

  @REALM-056
  Scenario: Cutting the roads starves the outer ring without a battle
    Given an enemy army sits between the castle of "Troyes" and its outer ring
    When the spread runs
    Then the provinces of the outer ring receive nothing from "Troyes"

  @REALM-057
  Scenario: Rice lands harvest twice, and war can wreck their canals
    Given a rice province of "Ming" has irrigated rice land fed by canals
    When the year's harvests are rolled
    Then it harvests twice
    When war wrecks its canals
    Then its irrigated rice land no longer harvests twice

  @REALM-057
  Scenario: New crops arrive after Atlantic contact
    Given the country "Castile" has made Atlantic contact
    When it learns "F9 Maize, potato and cassava"
    Then its failed harvests become poor ones

  @REALM-058
  Scenario: Famine
    Given the province "Dijon" of the lord "Philip of Burgundy" runs out of food
    When the famine strikes
    Then people of "Dijon" die
    And survivors flee to neighbouring provinces or abroad
    And a revolt in "Dijon" becomes likely
    And the lord "Philip of Burgundy" turns "Disloyal"
    And the event tree's famine events read the same store

  @REALM-059
  Scenario: Scorched earth starves an invader
    Given an enemy army is about to march into the province "Picardy"
    When the country "France" burns its own fields in "Picardy"
    Then the enemy army finds nothing to forage there
