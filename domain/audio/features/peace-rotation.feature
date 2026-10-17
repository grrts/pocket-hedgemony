@context-audio
Feature: Peace rotation and zoom mix
  As a player in a long peaceful reign
  I want varied peace music with silences
  So that the most-heard state never tires me

  @AUD-048 @placeholder
  Scenario Outline: Pick weights
    Given the music is in peace rotation
    Then the next track comes from <source> with weight <weight>

    Examples:
      | source | weight |
      | the player's own palette | 0.60 |
      | the current era theme | 0.20 |
      | the palette of the region the camera looked at for 20 seconds at regional zoom | 0.15 |
      | a neighbour's palette | 0.05 |

  @AUD-049
  Scenario: You hear where you look, only at track changes
    Given a peace track from the player's palette is playing
    When the camera rests on West Africa at regional zoom for 30 seconds
    Then the current track plays on unchanged
    And the next pick may come from the "west_africa" palette

  @AUD-050
  Scenario: No repeat of the last three
    Given the last three tracks were "peace_europe_early", "era_2" and "peace_mena_early"
    When the next peace track is picked
    Then it is none of those three

  @AUD-051 @AUD-052 @placeholder
  Scenario: Loops, silence and era variant
    When a peace track starts
    Then its era variant is chosen as it starts
    And it plays 1 to 2 loops
    And 10 to 40 seconds of silence follow before the next track

  @AUD-053
  Scenario: An era change brings its theme
    Given the date reaches 1650-01-01
    When the next peace track is due
    Then the age stinger that caused the change plays
    And then "era_3" plays in full

  @AUD-054
  Scenario: Own palette only
    Given the variety setting is "own palette only"
    When the next peace track is picked
    Then it comes from the player's own palette

  @AUD-055 @placeholder
  Scenario Outline: Zoom changes the mix, not the track
    Given zoom mix is on
    When the camera is at <zoom> zoom
    Then <mix>

    Examples:
      | zoom | mix |
      | world | the full arrangement plays |
      | local | percussion drops 3 dB and the lead comes forward 1 dB |

  @AUD-056
  Scenario: Over a battle province in wartime
    Given zoom mix is on and the player is at war
    When the camera is over a battle province at local zoom between battles
    Then layer 3 of "war_campaign" comes in

  @AUD-055
  Scenario: Zoom mix off
    Given zoom mix is off
    When the camera moves to local zoom
    Then the mix does not change
