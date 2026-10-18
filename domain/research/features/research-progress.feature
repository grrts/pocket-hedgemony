@context-research
Feature: Research progress
  As a player
  I want scholars and students to add scholar-years to the invention I study
  So that I unlock inventions one at a time

  @RSCH-010 @RSCH-011 @RSCH-067 @placeholder
  Scenario: France studies Bastion forts
    # config: research.scholar_rate, research.student_rate, research.research_months_per_year
    Given the date is 1500
    And the country "France" has 35 scholars and 200 students
    And it studies "B5 bastion_fortification" with 0 scholar-years of progress
    When a month passes
    Then 6.25 scholar-years are added to "B5 bastion_fortification"
    When 6 more months pass
    Then the country "France" knows "B5 bastion_fortification"

  @RSCH-012
  Scenario: Closed schools stop progress but keep what is known
    Given the country "France" knows "L5 printing" and is 62 % through "B5 bastion_fortification"
    When all its schools close
    Then progress on "B5 bastion_fortification" stops
    And the country "France" still knows "L5 printing"

  @RSCH-013 @RSCH-071 @placeholder
  Scenario: Stealing an invention in war
    # config: research.steal_share_of_cost
    Given the date is 1550
    And the country "Ottomans" is at war with "Venice", which knows "S7 Galleon"
    And the country "Ottomans" studies "S7 Galleon" with 0 scholar-years of progress
    When the Ottomans occupy a Venetian province with an open school
    Then the country "Ottomans" gains 4 scholar-years toward "S7 Galleon"

  @RSCH-014 @placeholder
  Scenario Outline: One study at a time, two with an academy
    # config: research.studies_with_academy
    Given the country "<country>" <academy>
    When it chooses what to study
    Then it can study <count> at once

    Examples:
      | country | academy                          | count |
      | France  | has no academy-level school      | 1     |
      | England | has an academy of science        | 2     |

  @RSCH-068 @placeholder
  Scenario: Two studies share the scholar-years evenly
    # config: research.second_study_share
    Given the date is 1650
    And the country "England" has an academy of science, 40 scholars and 0 students
    And it studies "B6 Star forts" and "F12 Fodder crops (clover, turnips)"
    When a year passes
    Then each study has 20 scholar-years of progress
