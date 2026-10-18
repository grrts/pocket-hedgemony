@context-subjects
Feature: France, 1444 to 1453
  As the French player
  I want to manage eleven subjects with a subject limit of seven
  So that I learn the subject buttons and reasons in one worked example

  Background:
    Given the date is "1444-11-11"
    And the country "France" has high administrative capacity and subject limit 7
    And "France" has 10 vassals and the appanage "Dauphiné"

  @SUBJ-036 @SUBJ-058
  Scenario: The start
    Given the subject rules are in force
    When the scenario starts
    Then "Brittany" starts "Wavering"
    And "Armagnac" starts "Loyal"
    And "France" uses 11 of its subject limit of 7
    And "Brittany" and "Foix" have the reason "Stretched thin"
    And the 4 furthest subjects of "France" have 1 more down arrow from being over the subject limit

  @SUBJ-064 @SUBJ-066 @SUBJ-067
  Scenario: Folding in the Dauphiné
    Given "Dauphiné" is a Loyal Vassal with "Kin", a subject since 1349, with 3 provinces
    When "France" sends one envoy to fold it in for 3 months
    Then the Dauphin is a great lord inside the realm of "France"
    And "France" uses 10 of its subject limit of 7

  @SUBJ-064
  Scenario: Folding in two small vassals
    Given "France" uses 10 of its subject limit of 7
    When "France" folds in "French minor lordships" and "Nevers" over the next years
    Then "France" uses 8 of its subject limit of 7
    And the lord capacity of "France" fills up instead

  @SUBJ-030 @SUBJ-040 @SUBJ-043
  Scenario: Brittany is courted
    Given "England" stations an envoy at the court of "Brittany"
    And "France" stations a resident there and arranges a marriage
    When the season ends with "Brittany" at 3 up and 3 down arrows
    Then "Brittany" stays "Wavering"
    When the war with "England" resumes in 1449 and "France" calls "Brittany"
    Then "Brittany" comes with half its army, late

  @SUBJ-037 @SUBJ-078 @SUBJ-107
  Scenario: Armagnac is folded in by force
    Given "France" sets the tribute of "Armagnac" to heavy to pay for the war
    And "Armagnac" turns "Disloyal" and an event makes it rise
    When "France" wins the war against "Armagnac"
    Then the peace folds "Armagnac" in at once because it shares a border
    And every other subject of "France" has the reason "Force used" at -1 for 5 years
