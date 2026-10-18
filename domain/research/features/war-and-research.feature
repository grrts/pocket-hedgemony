@context-research
Feature: Why war and research don't mix
  As a player
  I want schools to compete with the army for men and gold
  So that peace and war each have a price in research

  @RSCH-020
  Scenario: Every seat is a man the army can't raise
    Given the country "France" has 48,000 recruits and 0 students
    When it fills 200 school seats
    Then it can raise at most 47,800 recruits as soldiers

  @RSCH-021 @RSCH-070 @placeholder
  Scenario: Schools cost gold every year
    # config: research.school_upkeep
    Given the country "France" has 4 schools and 310 gold
    When a year passes
    Then it pays school upkeep from the same gold that pays soldiers
    And the country "France" has 302 gold

  @RSCH-022
  Scenario: Calling students to arms
    Given the country "France" has 200 students and studies "B5 bastion_fortification"
    When the player calls the students to arms
    Then the country "France" has 200 more recruits and 0 students
    And research stops
    And those 200 never become scholars

  @RSCH-023
  Scenario: War damages schools
    Given the province "Milan" has a university and 20 scholars
    And the neighbouring country "Venice" is at peace
    When a battle is fought in "Milan"
    Then the university of "Milan" may be sacked
    And its scholars may flee to "Venice"

  @RSCH-072 @placeholder
  Scenario: A sacked school scatters half its scholars
    # config: research.sack_chance_pct, research.sack_scholars_flee_share
    Given the province "Milan" has a university and 20 scholars
    And the neighbouring country "Venice" is at peace
    When a battle is fought in "Milan" and the sack roll comes up
    Then the university of "Milan" is lost
    And 10 scholars flee to "Venice"
    And over many battles about 25 % of the rolls sack the school

  @RSCH-073 @placeholder
  Scenario Outline: A richer neighbour poaches scholars each January
    # config: research.poach_gold_ratio, research.poach_one_in
    Given the country "Milan" has 40 scholars and <gold> gold
    And its neighbour "Venice" has <rich> gold
    When the year begins
    Then the country "Milan" loses <lost> scholars to "Venice"

    Examples:
      | gold | rich | lost |
      | 100  | 250  | 2    |
      | 100  | 150  | 0    |

  @RSCH-075 @placeholder
  Scenario: Scholars grow old
    # config: research.old_age_one_in
    Given the country "Milan" has 60 scholars and 100 gold
    When the year begins
    Then the country "Milan" loses 2 scholars to old age

  @RSCH-078
  Scenario Outline: What the AI studies and how it fills seats
    Given the date is 1444
    And the AI country "Hungary" has 200 empty seats
    And it is <state>
    When the AI plans its research
    Then it studies the cheapest invention it may study, ties by id
    And it fills <seats> seats

    Examples:
      | state     | seats |
      | at peace  | 200   |
      | at war    | 0     |

  @RSCH-080
  Scenario Outline: Guano lasts thirty years
    Given the country "Peru" learned "F16 Guano and imported fertilizer" in 1850
    When the year <year> begins
    Then its inventions give <steps> harvest steps from guano

    Examples:
      | year | steps |
      | 1860 | 1     |
      | 1879 | 1     |
      | 1880 | 0     |
