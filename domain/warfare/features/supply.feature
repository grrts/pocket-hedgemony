@context-warfare
Feature: Supply: feeding an army
  As a player
  I want my armies to carry a food reserve, refill at home, plunder abroad and starve when it runs out
  So that food, not a number, limits how far and how long an army can campaign

  # Config keys: warfare.rations.*, warfare.logistics.food_cut, warfare.logistics.sickness_cut,
  # warfare.reserve.rot, warfare.reserve.rot_slow_logistics, warfare.wagon.rations, warfare.wagon.horses,
  # warfare.reserve_sizes, warfare.foraging_rating, warfare.hunger.*, warfare.sickness

  @WAR-071 @placeholder
  Scenario Outline: Logistics cuts what an army eats
    Given an army of 10000 soldiers and no horses on campaign
    And its commander has Logistics <logistics>
    When the month ends
    Then it eats <rations> rations

    Examples:
      | logistics | rations |
      | 0         | 20000   |
      | 2         | 18000   |
      | 4         | 16000   |

  @WAR-072
  Scenario: At home an army eats from its castle first, then the locals
    Given an army of "France" at "Troyes" with a full reserve
    And the castle of "Troyes" holds food above its siege reserve
    When a week passes
    Then the army takes its week's meals from the castle store of "Troyes"
    And the local store of "Troyes" is not touched

  @WAR-072
  Scenario: At home an army refills only what its reserve is missing
    Given an army of "France" at "Reims" whose reserve is missing 10000 rations
    And "Reims" has no castle of France
    When a week passes
    Then it takes its week's meals plus 10000 rations from the local store of "Reims"
    And its reserve is full

  @WAR-072
  Scenario: The castle store is used only down to its siege reserve
    Given the castle of "Troyes" holds exactly its siege reserve
    And an army of "France" at "Troyes" needs food
    When a week passes
    Then the army takes its food from the local store of "Troyes"

  @WAR-073
  Scenario Outline: Abroad an army eats its reserve
    Given an army of "France" stands in <land>
    When a week passes
    Then it eats from its food reserve
    And its reserve shrinks

    Examples:
      | land                    |
      | an enemy province       |
      | a neutral province      |
      | an ally's province      |

  @WAR-074 @placeholder
  Scenario Outline: Plunder when the reserve is empty
    Given an army of "France" with an empty reserve in the enemy province "Langres"
    And the ground of "Langres" has foraging rating "<rating>"
    When it takes 1000 rations' worth from the local store
    Then it gets <got> rations

    Examples:
      | rating      | got  |
      | rich        | 1000 |
      | fair        | 600  |
      | poor        | 300  |
      | almost none | 100  |

  @WAR-074
  Scenario: When the local store is gone the crop burns
    Given an army with an empty reserve in an enemy province whose local store is gone
    When a week passes
    Then one tile of the province turns burned
    And the army eats one season of that tile's food at once
    And its reserve stays empty

  @WAR-075 @placeholder
  Scenario Outline: The reserve grows and shrinks
    Given an army with 20000 rations in its reserve and room for 30000
    When <event>
    Then its reserve holds <rations> rations

    Examples:
      | event                                                     | rations |
      | it captures an enemy army's wagons holding 5000 rations   | 25000   |
      | it takes an enemy castle whose store holds 8000 rations   | 28000   |
      | a month of rot passes                                     | 19000   |
      | it breaks in a battle                                     | 10000   |

  @WAR-075 @placeholder
  Scenario: Good logistics halves rot
    Given an army with 20000 rations in its reserve and a commander with Logistics 3
    When a month of rot passes
    Then its reserve holds 19500 rations

  @WAR-076 @placeholder
  Scenario Outline: Wagons limit the reserve
    Given an army with 30 wagons
    And its country <knows> "W10 Supply magazines"
    When the month is played
    Then its reserve can hold at most <rations> rations
    And its wagons need 60 horses

    Examples:
      | knows        | rations |
      | does not know| 30000   |
      | knows        | 45000   |

  @WAR-077
  Scenario Outline: Reserve size is a standing order
    Given an army of "France"
    When the player sets its reserve size to <months> months
    Then the army tries to keep <months> months of food

    Examples:
      | months |
      | 1      |
      | 2      |
      | 3      |

  @WAR-078
  Scenario: Taking food from the locals makes them Requisitioned
    Given an army takes food from the local store of "Reims"
    When the month is played
    Then "Reims" gets Requisitioned for a season
    And if "Reims" drops under a month of food it gets Hungry

  @WAR-079
  Scenario: A lord resents an army eating his grain
    Given an army of "France" takes food in a province of the lord "Duke of Bourbon" this season
    When the month is played
    Then the lord "Duke of Bourbon" loses a step of loyalty

  @WAR-080
  Scenario: A no-quartering charter is broken by taking
    Given the province "Reims" has a no-quartering charter
    When an army of "France" takes food from "Reims"
    Then "Reims" gets Broken charter

  @WAR-081 @placeholder
  Scenario: The forage limit
    Given the province "Troyes" has 60000 rations in its local store
    And its foraging rating is "rich"
    When the month is played
    Then its forage limit is 30000 soldiers

  @WAR-082
  Scenario: A taken enemy castle's store goes into the reserve
    Given an army of "Burgundy" takes the castle of "Troyes"
    When the month is played
    Then the castle store of "Troyes" goes into the army's reserve

  @WAR-083 @placeholder
  Scenario: Hunger
    Given an army of 10000 men and 1000 horses with no food
    When a week passes
    Then 500 men desert, levies first and standing regiments last
    And 200 men die
    And 100 horses are eaten
    And it fights at -20 % strength and -10 % break point

  @WAR-084 @placeholder
  Scenario Outline: Sickness by ground
    Given an army of 10000 men born on that ground stays a month in ground of sickness "<sickness>"
    And its commander has Logistics 0
    When the month is played
    Then it loses <sick> men to sickness
    And the sick are counted for the player

    Examples:
      | sickness | sick |
      | low      | 50   |
      | medium   | 100  |
      | high     | 300  |
      | heat     | 200  |

  @WAR-084 @placeholder
  Scenario: Logistics cuts sickness
    Given an army of 10000 men stays a month in ground of sickness "high"
    And its commander has Logistics 2
    When the month is played
    Then it loses 240 men to sickness

  @WAR-084
  Scenario: Men not born on the ground suffer fever land too
    Given an army of men from "France" stays a month in a fever land province
    When the month is played
    Then it loses the ground's sickness plus the fever land rate

  @WAR-085 @placeholder
  Scenario: Winter quarters
    Given an army of 10000 men stops for the winter in "Troyes", a province with a town
    When a month passes
    Then it eats 10000 rations from the local store of "Troyes"
    And its companies drill
    And after a season "Troyes" gains Soldiers quartered

  @WAR-085
  Scenario: A no-quartering charter refuses winter quarters
    Given the province "Reims" has a no-quartering charter
    When an army tries to stop for the winter in "Reims"
    Then "Reims" refuses to quarter it

  @WAR-086 @placeholder
  Scenario: Armies in the field eat more in winter
    Given an army of 10000 soldiers in the field in winter
    When the month ends
    Then it eats 25000 rations

  @WAR-087
  Scenario: Burn the fields ahead of an invader
    Given an enemy army approaches the French province "Champagne"
    When France orders Burn the fields in "Champagne"
    Then every food tile of "Champagne" burns
    And its local store goes to the nearest castle or is destroyed
    And "Champagne" gains Burned homes and Hungry
    And the invader finds nothing to forage there

  @WAR-088
  Scenario: Magazines in occupied provinces
    Given the country "Sweden" knows "W10 Supply magazines"
    And it builds a magazine in an occupied province
    When its army stands there
    Then the army refills its reserve as if at home
