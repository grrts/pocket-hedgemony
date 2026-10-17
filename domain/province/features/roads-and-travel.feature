@context-province
Feature: Roads and travel
  As the game
  I want roads, rivers and days to the capital counted per province
  So that distance costs tax, slows orders and causes grievances

  @PROV-170
  Scenario Outline: Road steps are unlocked by inventions
    Given the province "Troyes" has a "<from>" road
    And the country "France" knows the invention for "<to>"
    When the country "France" pays gold times the ground's build cost
    Then the province "Troyes" has a "<to>" road

    Examples:
      | from       | to         |
      | track      | road       |
      | road       | paved road |
      | paved road | turnpike   |
      | turnpike   | railway    |

  @PROV-171
  Scenario Outline: Roads are lost
    Given the province "Troyes" has a "paved road"
    When <cause>
    Then the road of "Troyes" falls a step

    Examples:
      | cause                    |
      | upkeep is neglected      |
      | fighting wrecks it       |
      | a flood breaks it        |

  @PROV-172
  Scenario: Canals add a river, war wrecks it
    Given the country "Ming" knows the invention "B3 Grand canals"
    When a canal is dug through the province "Shandong"
    Then "Shandong" counts as a river province, one ring closer for castle food spread
    When the canal is wrecked in war
    Then "Shandong" no longer counts as a river province

  @PROV-173
  Scenario Outline: Days to capital follow the fastest route
    Given the province "Troyes" is <days> days from "Paris" by road
    And <condition>
    When the game works out the province's stats
    Then the days to capital of "Troyes" are <result>

    Examples:
      | days | condition                             | result          |
      | 3    | nothing blocks the road               | 3               |
      | 3    | it is winter                          | more than 3     |
      | 3    | an enemy army stands on the road      | more than 3     |
      | 12   | a seat stands 2 days away             | 2               |

  @PROV-174 @placeholder
  Scenario Outline: Far from the throne
    # config: province.far_from_throne.days (example 30)
    Given the province "Gascony" is <days> days from the capital or a seat
    When the game works out the province's stats
    Then the "Far from the throne" grievance is <state>

    Examples:
      | days | state   |
      | 20   | absent  |
      | 35   | present |
