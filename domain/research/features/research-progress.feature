@context-research
Feature: Research progress
  As a player
  I want scholars and students to add scholar-years to the invention I study
  So that I unlock inventions one at a time

  @RSCH-010 @RSCH-011 @placeholder @open-question
  Scenario: France studies Bastion forts
    # config: research.scholar_rate, research.student_rate; OQ-RSCH-6 on monthly accrual
    Given the country "France" has 35 scholars and 200 students
    And it studies "B5 bastion_fortification" with 0 scholar-years of progress
    When a year passes
    Then 75 scholar-years are added to "B5 bastion_fortification"
    And the country "France" knows "B5 bastion_fortification" once its progress reaches its cost

  @RSCH-012
  Scenario: Closed schools stop progress but keep what is known
    Given the country "France" knows "L5 printing" and is 62 % through "B5 bastion_fortification"
    When all its schools close
    Then progress on "B5 bastion_fortification" stops
    And the country "France" still knows "L5 printing"

  @RSCH-013 @open-question
  Scenario: Stealing an invention in war
    # OQ-RSCH-10: no rule given
    Given the country "Ottomans" is at war with "Venice", which knows "S7 Galleon"
    When the Ottomans steal it in war
    Then the country "Ottomans" gains progress toward "S7 Galleon"

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
