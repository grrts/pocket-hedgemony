@events
Feature: Bridge events of 1378 to 1444 in Asia, Africa and the Americas
  As a player starting in 1378
  I want the realms of Asia, Africa and the Americas to meet the turning points they met in history
  when their reasons hold, and not because the year has come
  So that history usually runs its course, can bend, and every campaign still differs

  @EVT-095
  Scenario: The southern bridge events are well formed and never forced by their date
    Given the southern bridge events
    Then every southern bridge event passes the event tree's build checks
    And every option of every southern bridge event applies without error
    And no southern bridge event is mandatory
    And every southern bridge event belongs to the Age of Schism and Conquerors
    And every southern bridge event has a name, a summary and a name for each option

  @EVT-095
  Scenario: From a 1444 start the bridge events of earlier years have already happened, as in history
    Given a game whose campaign starts in 1444
    Then its events include "chanka_war"
    And "chanka_war" has already happened with the option "stand_with_inca_yupanqui"
    And "great_law_of_peace" has not happened yet
    And its event "inca_expansion" opens in 1400
    Given a game whose campaign starts in 1378
    Then "chanka_war" has not happened yet

  @EVT-096
  Scenario: The Inca expand after they beat the Chanka, not because 1444 has come
    Given the southern bridge events in 1420
    And "inca" stands with "admin_capacity" 40 and borders "chimu"
    And "chanka" stands
    Then the bridge event "inca_expansion" cannot fire
    When "chanka_war" ends with the option "stand_with_inca_yupanqui"
    Then the bridge event "inca_expansion" can fire

  @EVT-096
  Scenario: An Inca court that fled from the Chanka does not expand while the Chanka stand
    Given the southern bridge events in 1440
    And "inca" stands with "admin_capacity" 40 and borders "chimu"
    And "chanka" stands
    When "chanka_war" ends with the option "flee_with_viracocha"
    Then the bridge event "inca_expansion" cannot fire

  @EVT-096
  Scenario Outline: The 1444 floors of the south give way to the event's reason
    Given the southern bridge events
    Then the event "<event>" opens in <earliest> and requires the event "<requires>"

    Examples:
      | event                 | earliest | requires         |
      | inca_expansion        | 1400     | chanka_war       |
      | aztec_imperial_height | 1430     | tepanec_war      |
      | majapahit_collapse    | 1420     | paregreg_war     |

  @EVT-097
  Scenario: Malacca is founded only after Singapura falls
    Given the southern bridge events in 1400
    And "majapahit" stands
    And "singapura" stands
    Then the bridge event "malacca_founded" cannot fire
    When "majapahit_sacks_singapura" ends with the option "sack_singapura"
    Then the bridge event "malacca_founded" can fire
    When "malacca_founded" ends with the option "found_malacca_under_ming"
    Then "malacca" now stands

  @EVT-098
  Scenario: The Triple Alliance forms when Maxtla's usurpation turns the Mexica against Azcapotzalco
    Given the southern bridge events in 1428
    And "aztec_triple_alliance" is a tributary of "tepanecs"
    Then the bridge event "tepanec_war" cannot fire
    When "death_of_tezozomoc" ends with the option "maxtla_usurps"
    Then the bridge event "tepanec_war" can fire
