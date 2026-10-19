@context-scenario-setup
Feature: Sleeping realms
  As the game
  I want realms that history founds after 1444 to be in every campaign from the start, asleep
  So that events, risings and breakups can found them on the map

  @SETUP-080 @SETUP-082
  Scenario: Spain sleeps at the start
    Given a new campaign starts on 11 November 1444
    Then "Spain" is a sleeping realm
    And it holds no land, armies or relations
    And it is not in the realm picker

  @SETUP-081 @placeholder
  Scenario: Spare sleepers
    # config: sleeping_realms.spare_count
    Given a new campaign starts on 11 November 1444
    Then there are 12 spare sleeping realms

  @SETUP-083 @SETUP-084
  Scenario: A realm wakes on its home land
    Given a new campaign starts on 11 November 1444
    When "Dutch Republic" wakes on the province "Zuid-Holland"
    Then "Dutch Republic" holds "Zuid-Holland" as its capital
    And it has a ruler, a form of government, gold and levies
    And it stands at neutral with every realm

  @SETUP-085
  Scenario: A union forms Spain
    Given a new campaign starts on 11 November 1444
    When "Spain" wakes formed from "Castile" and "Aragon"
    Then every province of "Castile" and "Aragon" belongs to "Spain"
    And "Castile" and "Aragon" are gone

  @SETUP-085
  Scenario: The player plays on as the formed realm
    Given a new campaign starts on 11 November 1444
    And the player rules "Castile"
    When "Spain" wakes formed from "Castile" and "Aragon"
    Then the player plays "Spain"
    And a dispatch says "Your realm is now Spain"

  @SETUP-086
  Scenario: A realm breaks away
    Given a new campaign starts on 11 November 1444
    When "Transylvania" breaks away from "Hungary" on its home land
    Then "Hungary" keeps every other province
    And "Transylvania" and "Hungary" hold a truce

  @SETUP-087
  Scenario: A realm wakes as a subject
    Given a new campaign starts on 11 November 1444
    When "Transylvania" wakes on its home land as a subject of "Ottomans"
    Then "Ottomans" is the overlord of "Transylvania"

  @SETUP-088
  Scenario: A spare sleeper wakes for a homeland
    Given a new campaign starts on 11 November 1444
    When a spare sleeper wakes as "Armorica" on the province "Morbihan"
    Then a realm called "Armorica" holds "Morbihan"
    And there are 11 spare sleeping realms

  @SETUP-089
  Scenario: A gone realm wakes again
    Given a new campaign starts on 11 November 1444
    And "Brittany" is gone
    When "Brittany" wakes on its home land
    Then "Brittany" holds land again

  @SETUP-090
  Scenario: No land to give
    Given a new campaign starts on 11 November 1444
    When "Spain" wakes on no province
    Then "Spain" is a sleeping realm

  @SETUP-091
  Scenario: Saves keep who sleeps
    Given a new campaign starts on 11 November 1444
    And "Dutch Republic" wakes on the province "Zuid-Holland"
    When the game is saved and loaded
    Then "Dutch Republic" holds "Zuid-Holland"
    And "Spain" is a sleeping realm

  @SETUP-092
  Scenario: The founding card
    Given a new campaign starts on 11 November 1444
    When "Spain" wakes formed from "Castile" and "Aragon"
    Then a major dispatch reads "Spain is founded from Castile and Aragon"
    And it centres the map on "Spain"
