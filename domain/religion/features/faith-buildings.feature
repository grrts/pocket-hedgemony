@context-religion
Feature: Faith buildings
  As a player
  I want each faith building to pull the mix and, for most, to serve a community
  So that who builds houses of worship decides which way a province turns

  @RELG-028 @RELG-030 @RELG-031 @RELG-032 @RELG-033 @placeholder
  Scenario Outline: Pull and serving per building
    # config keys: pull.house_steps, pull.minority_house, pull.monastery, pull.pilgrimage_shrine, pull.school_of_faith
    Given the province "Testshire" has a <building> of the faith "orthodox", at least half filled with clergy
    When the year's pulls are worked out
    Then "orthodox" gets <pull> pull from it
    And the building <serves> the orthodox community

    Examples:
      | building                       | pull | serves         |
      | house of worship at step 1     | 1    | serves         |
      | house of worship at step 2     | 1.5  | serves         |
      | house of worship at step 3     | 2    | serves         |
      | minority house of worship      | 0.5  | serves         |
      | monastery without seats        | 1    | serves         |
      | monastery with seats           | 1.5  | serves         |
      | religious school               | 0.5  | does not serve |
      | pilgrimage shrine              | 1    | serves         |

  @RELG-028 @placeholder
  Scenario: A landmark house reaches the realm
    # config key: pull.landmark_house
    Given the country "Byzantium" owns the Hagia Sophia, a step-4 house of "orthodox", in "Constantinople"
    When the year's pulls are worked out
    Then "orthodox" gets 3 pull in "Constantinople"
    And "orthodox" gets 0.5 pull in every province of "Byzantium" within 3 rings of "Constantinople"

  @RELG-029
  Scenario: A house for a faith that is not the ruler's
    Given the country "Ottomans" has the state faith "sunni"
    And the province "Thessaloniki" has an orthodox community
    Then an orthodox house of worship can be built in "Thessaloniki"

  @RELG-030 @placeholder
  Scenario Outline: A minority house needs a community or a charter
    # config key: houses.minority_house_needs_share
    Given the faith "jewish" is <share> of "Kraków"
    And "Kraków" <charter> a "Faith tolerance" charter for "jewish"
    Then a jewish minority house of worship is <allowed> in "Kraków"

    Examples:
      | share | charter  | allowed     |
      | 0.10  | has no   | allowed     |
      | 0.05  | has no   | not allowed |
      | 0.05  | has      | allowed     |

  @RELG-034 @RELG-035 @placeholder
  Scenario: Taking over a house
    # config keys: houses.convert_cost_share_of_build, houses.take_over_gold, houses.take_over_spark, houses.take_over_old_faith_lords
    Given the country "England" has the state faith "anglican"
    And the province "Yorkshire" has a catholic monastery with monastic land
    And the lord "Percy" is catholic
    When the country "England" converts the monastery to "anglican"
    Then "England" pays half the cost of building it
    And its pull now goes to "anglican"
    And its property's gold is paid into the treasury twice over for monastic land
    And an "insult to faith" spark is raised in "Yorkshire"
    And the lord "Percy" wavers one step

  @RELG-036 @RELG-037 @RELG-038 @placeholder
  Scenario Outline: Tithes and building by the clergy
    # config key: houses.tithe_gold_per_10000_people
    Given the realm of "Poland" has 50,000 people of the faith "jewish"
    And "jewish" is <policy> in "Poland"
    When a year ends
    Then <result>

    Examples:
      | policy     | result                                                                              |
      | Tolerated  | the jewish clergy's purse gains 5 gold and they may build a house in a town of their faith |
      | Restricted | the jewish clergy's purse gains 5 gold but they build no new house                  |
      | Persecuted | the jewish clergy's purse is seized                                                 |

  @RELG-039 @placeholder
  Scenario Outline: A preacher founds a house
    # config key: houses.preacher_founds_house_after_years
    Given a catholic preacher has been in "Kongo" for <years> years
    And "Kongo" has no catholic house
    Then a step-1 catholic house is <founded> in "Kongo"

    Examples:
      | years | founded     |
      | 9     | not founded |
      | 10    | founded     |

  @RELG-040
  Scenario Outline: How houses lose their pull
    Given the province "Magdeburg" has a step-2 catholic church
    When <event>
    Then the church <result>

    Examples:
      | event                                                     | result                       |
      | the town is sacked and the church burned                  | gives no pull                |
      | catholic is Persecuted and the realm closes its houses     | gives no pull for catholic   |
      | the state faith changes and the realm takes the houses over | pulls for the new state faith |
      | the church has fewer than half its clergy                 | gives half its pull          |

  @RELG-041
  Scenario Outline: Clergy marry or not by faith
    When the faith list is loaded
    Then the clergy of "<faith>" <marry>

    Examples:
      | faith      | marry          |
      | catholic   | do not marry   |
      | protestant | marry          |
      | orthodox   | marry          |
      | theravada  | do not marry   |
      | jain       | do not marry   |
