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

  @RSCH-021
  Scenario: Schools cost gold every year
    Given the country "France" has 4 schools and 310 gold
    When a year passes
    Then it pays school upkeep from the same gold that pays soldiers

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
