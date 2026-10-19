@context-events
Feature: Founding events wake realms
  As the game
  I want an event that founds a realm to put it on the map
  So that Spain, the Dutch Republic or Transylvania appear when history makes them

  @EVT-077
  Scenario: A union founds Spain
    Given a new campaign starts on 11 November 1444
    When an event founds "spain" from "castile" and "aragon"
    Then "Spain" holds every province "Castile" and "Aragon" held
    And a dispatch reads "Spain is founded from Castile and Aragon"

  @EVT-077
  Scenario: A revolt founds the Dutch Republic on Holland
    Given a new campaign starts on 11 November 1444
    When an event founds "dutch_republic" on "area:holland" from "burgundy"
    Then "Dutch Republic" holds "Zuid-Holland"
    And "Dutch Republic" and "Burgundy" hold a truce

  @EVT-077
  Scenario: A realm founded as a subject
    Given a new campaign starts on 11 November 1444
    When an event founds "transylvania" on "area:transylvania" as a subject of "ottoman"
    Then "Ottomans" is the overlord of "Transylvania"
    And "Hungary" no longer holds "Cluj"

  @EVT-077 @EVT-078
  Scenario: A realm the list does not hold takes a spare
    Given a new campaign starts on 11 November 1444
    When an event founds "kazakh_khanate" on "area:kabul"
    Then a realm called "Kazakh Khanate" holds "Kabul"
    And the event tree knows it as "kazakh_khanate"

  @EVT-077
  Scenario: A place the map does not know founds nothing
    Given a new campaign starts on 11 November 1444
    When an event founds "mahdist_sudan" on "area:sudan"
    Then no realm wakes

  @EVT-079
  Scenario: Every realm has a region a where-limit can bind
    Given a new campaign starts on 11 November 1444
    Then "Bavaria" lies in "region:germany" and in "region:europe"
    And "Brittany" lies in "region:europe"
    And "Ming" lies in "region:east_asia"

  @EVT-080
  Scenario: Japan is the tree's Ashikaga
    Given a new campaign starts on 11 November 1444
    Then the event tree knows "Japan" as "ashikaga"
    And the event tree knows "Korea" as "joseon"
    And the event tree knows "Khmer" as "cambodia"
