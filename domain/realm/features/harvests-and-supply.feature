@context-realm
Feature: Harvests and army supply
  As the game
  I want every province to roll a real harvest by its climate, and armies to eat from the land
  So that bad years and long wars bring hunger

  @REALM-215 @placeholder
  Scenario: Each province rolls its own harvest
    # config: food_year.base_harvest
    Given a province rolls its own harvest many times
    When the rolls are counted
    Then about 10 % are poor, 70 % normal, 15 % good and 5 % bumper
    And none is failed before weather and war

  @REALM-216 @placeholder
  Scenario Outline: The region's weather is read by climate
    # config: food_year.weather, food_year.climate_weather
    Given a region's weather is rolled many times
    When a <climate> province reads each roll
    Then about 1 in <bad> rolls bring it <name>

    Examples:
      | climate   | bad | name        |
      | temperate | 6   | bad weather |
      | dry       | 4   | drought     |
      | monsoon   | 5   | floods      |

  @REALM-216
  Scenario: Neighbours of different climates suffer together
    Given a temperate province and a dry province lie in one weather region
    When the region rolls bad weather for the temperate province
    Then the dry province has a drought in the same year

  @REALM-217
  Scenario Outline: When a province harvests
    Given a <ground> province at <longitude> east and latitude <latitude>
    And its realm <knows> wet-rice terracing
    When its harvests are worked out
    Then it harvests <harvests>

    Examples:
      | ground   | longitude | latitude | knows         | harvests               |
      | farmland | 2         | 48       | does not know | in September           |
      | farmland | -60       | -34      | does not know | in March               |
      | farmland | 115       | 23       | knows         | in March and September |
      | farmland | 115       | 23       | does not know | in September           |
      | tundra   | 60        | 68       | does not know | never                  |

  @REALM-218 @placeholder
  Scenario: Armies eat more on campaign
    # config: food.campaign_eat, march.rationsPerSoldier, march.rationsPerHorse
    Given an army of 1,000 men and 200 horses
    When it spends a month at home in peace
    Then it eats 1,600 rations
    When it spends a month on campaign
    Then it eats 2,600 rations

  @REALM-219 @placeholder
  Scenario Outline: Armies refill from the province's store
    # config: march.homeReserveMonths, march.foraging
    Given a farmland province of 10,000 people holds 5 months of food
    When an army refills there in <whose> land
    Then it can take up to <rations> rations a month from the store

    Examples:
      | whose        | rations |
      | its own      | 30,000  |
      | an enemy's   | 50,000  |

  @REALM-220
  Scenario: Failed harvests are reported
    Given the harvests of "Toledo" and "Cuenca" of "Castile" fail
    When the harvest month ends
    Then "Castile" hears one dispatch naming "Toledo" and "Cuenca"
