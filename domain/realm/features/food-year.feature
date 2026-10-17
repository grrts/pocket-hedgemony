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

  @REALM-052 @REALM-167 @placeholder
  Scenario: Food moving between castles loses some of its load
    # config: food_year.transfer_loss_per_province
    Given the castle of "Paris" holds more than its share and "Calais" less
    When the castles exchange food until each holds its share
    Then the food sent from "Paris" to "Calais" arrives with less than was sent, losing some for every province it travels
    And 1,000 food sent 5 provinces arrives as 904

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

  @REALM-054 @REALM-167 @placeholder
  Scenario: Stores rot each season, less with granaries
    # config: food_year.rot_per_season, food_year.rot_per_season_with_granary
    Given the castles of "Troyes" and "Sens" hold the same food and only "Troyes" has a granary
    When a season passes
    Then both lose some food to rot
    And "Troyes" loses less
    And "Troyes" loses 2.5 % and "Sens" 5 %

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

  @REALM-050 @REALM-167
  Scenario Outline: The harvest comes in by hemisphere
    Given a province lies at latitude <latitude>
    When its harvest month is worked out
    Then its harvest comes in <month>

    Examples:
      | latitude | month     |
      | 48       | September |
      | -34      | March     |

  @REALM-050 @REALM-167 @placeholder
  Scenario: Weather odds per region
    # config: food_year.weather
    Given a weather region rolls its harvest weather many times
    When the rolls are counted
    Then about 1 in 6 is bad, 1 in 6 is good and the rest normal

  @REALM-032 @REALM-167 @placeholder
  Scenario Outline: A castle's reach follows its roads
    # config: food_year.reach_by_road
    Given the castle of "Troyes" stands on a <road>
    When its reach is worked out
    Then it feeds <rings> rings

    Examples:
      | road       | rings |
      | track      | 1     |
      | road       | 2     |
      | turnpike   | 3     |
      | railway    | 4     |
