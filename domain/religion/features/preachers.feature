@context-religion
Feature: Preachers
  As a player
  I want named preachers of my faith that I can send to provinces at home and abroad
  So that I can push my faith where I choose, at a risk abroad

  @RELG-068 @placeholder
  Scenario: Counting preachers
    # config keys: houses.preacher_per_monastery_or_religious_school, preachers.per_houses_of_state_faith, preachers.per_holy_place_held
    Given the country "Castile" has the state faith "catholic"
    And "Castile" has 2 catholic monasteries, 1 catholic religious school and 10 catholic houses of worship
    And "Castile" holds the holy place "Santiago de Compostela"
    When its preachers are counted
    Then "Castile" has 6 preachers

  @RELG-068 @RELG-103
  Scenario: Events grant preachers
    Given the event "council_of_trent" option "confessional_reform" fires for the catholic powers
    Then each gets 2 extra catholic preachers for 80 years

  @RELG-069
  Scenario: A preacher at work
    Given the country "Portugal" sends a catholic preacher to its province "Goa"
    Then the preacher travels there like an envoy
    And once there "catholic" gets 2 more pull in "Goa" each year

  @RELG-070 @RELG-071 @placeholder
  Scenario Outline: Where preachers may go
    # config key: preachers.foreign_without_leave_expel_chance_per_year
    Given the country "Portugal" sends a catholic preacher to <target>
    Then <result>

    Examples:
      | target                                         | result                                                       |
      | its own province "Goa"                         | he may go                                                    |
      | a province of its subject                      | he may go without permission                                 |
      | "Kongo", whose ruler gave "Allow preachers"    | he may go and stays                                          |
      | "Japan", whose ruler gave no leave             | he may go, and each year the ruler may expel or execute him  |

  @RELG-071
  Scenario: A preacher expelled abroad
    Given a catholic preacher of "Portugal" is in "Japan" without leave
    When the ruler of "Japan" expels him
    Then the flag "missionary_persecution" is set
    And "Portugal" gains the war aim "Defend the faith" against "Japan"
    And "Portugal" loses the preacher

  @RELG-072
  Scenario Outline: Losing preachers
    Given the country "Sweden" has 4 catholic preachers
    When <event>
    Then <result>

    Examples:
      | event                                   | result                          |
      | one is recalled                         | "Sweden" has 3 preachers        |
      | one is killed abroad                    | "Sweden" has 3 preachers        |
      | the state faith changes to protestant   | all catholic preachers are gone |

  @RELG-073
  Scenario: A preacher of a Persecuted faith leads a rising
    Given protestant is Persecuted in "France"
    And a protestant preacher is inside "France"
    When a protestant faith rising starts near him
    Then he leads it and it spreads twice as fast
