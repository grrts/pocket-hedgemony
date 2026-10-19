@context-audio
Feature: The ambience bed
  As a player
  I want a quiet bed of wind, surf or market under the map
  So that the map feels like a place, under the music and in the silences between tracks

  @AUD-080
  Scenario: On by default
    Given a fresh install
    Then the ambience setting is on

  @AUD-079 @placeholder
  Scenario Outline: The bed follows the ground under the camera
    Given ambience is on
    And the camera is at <zoom> zoom over <ground>
    Then the bed "<bed>" loops

    Examples:
      | zoom | ground | bed |
      | regional | coastal sea | amb_sea_coast |
      | regional | open ocean | amb_sea_ocean |
      | regional | steppe | amb_wind_plain |
      | regional | taiga | amb_forest |
      | regional | rainforest | amb_jungle |
      | regional | desert | amb_desert |
      | regional | mountains | amb_mountain |
      | regional | marsh | amb_marsh |
      | local | a big settlement | amb_town |
      | local | a province with an active siege | amb_war_front |

  @AUD-079
  Scenario: No bed at world zoom
    Given ambience is on
    When the camera is at world zoom
    Then no ambience bed is chosen

  @AUD-081
  Scenario: Winter, not weather
    Given ambience is on and the camera is over plains in January
    Then "amb_wind_plain" is windier than in summer
    And no rain or snow bed plays

  @AUD-082
  Scenario: Ambience fills peace silences
    Given ambience is on and the music is in a 20 second silence between peace tracks
    Then the ambience bed is heard in the silence
