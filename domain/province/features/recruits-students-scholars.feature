@context-province
Feature: Recruits, students and scholars here
  As the game
  I want recruits, students and scholars counted in each province
  So that levies and schools draw on real people

  @PROV-140 @PROV-296 @placeholder
  Scenario: Recruits refill from every class except clergy and scholars
    Given the province "Troyes" has 40,000 farmers, 5,000 craftsmen, 800 clergy, 100 scholars and 2,000 homeless
    When the year ends
    Then recruits here grow by 400 farmers, 50 craftsmen and 20 homeless
    And no clergy or scholars

  @PROV-296 @placeholder
  Scenario: Homeless drift and refugees settle
    Given the province "Troyes" has 2,000 homeless
    When the year ends
    Then 40 homeless drift to free slots elsewhere
    And refugees who have stayed 2 years settle

  @PROV-141
  Scenario Outline: Whose recruits they are
    Given the province "<province>" is governed by <ruler>
    When the game works out the province's stats
    Then its recruits go to <whom>

    Examples:
      | province | ruler                      | whom                     |
      | Troyes   | a royal official           | the country "France"     |
      | Dijon    | the lord "Philip of Burgundy" | the lord's retinue    |

  @PROV-142
  Scenario: A levy at harvest time empties the farms
    Given the province "Troyes" has 1,100 recruits drawn from its farmers
    When the country "France" raises 1,000 of them as soldiers
    Then 1,000 farm slots in "Troyes" are empty

  @PROV-143
  Scenario: Soldiers come home homeless
    Given 1,000 soldiers from "Troyes" are disbanded
    When they come home
    Then they join the homeless of "Troyes"
    And overflow into the emptiest slots

  @PROV-144 @placeholder
  Scenario Outline: Conscription grievance
    # config: province.recruits.conscription
    Given the province "Troyes" has recruits at <share> of its pool
    When the game works out the province's stats
    Then the "Conscription" grievance is <state>

    Examples:
      | share | state   |
      | 20 %  | present |
      | 40 %  | present if it started below a quarter |
      | 55 %  | absent  |

  @PROV-145
  Scenario: Local recruits fill local school seats first
    Given the province "Paris" has a school with 50 empty seats and 30 recruits
    When the country "France" enrols students to fill the seats
    Then 30 seats are filled from the recruits of "Paris"
    And 20 are filled from the realm's recruits

  @PROV-146
  Scenario Outline: Students here are lost
    Given the province "Paris" has 40 students
    When <cause>
    Then the province "Paris" has fewer students

    Examples:
      | cause                                     |
      | 10 students graduate                      |
      | the country calls the students to arms    |
      | plague strikes "Paris"                    |
      | the school of "Paris" is sacked           |

  @PROV-147
  Scenario Outline: Scholars here come and go
    Given the province "Paris" has 35 scholars
    When <cause>
    Then the province "Paris" has <result> scholars

    Examples:
      | cause                                                      | result |
      | 5 students graduate                                        | 40     |
      | 3 foreign scholars settle in a peaceful town with a school | 38     |
      | 2 scholars die of old age                                  | 33     |
      | war in "Paris" makes 10 flee                               | 25     |
      | a richer neighbour hires 4                                 | 31     |
