@context-audio
Feature: The track list
  As a player
  I want tracks for every screen, mood, war and moment
  So that the music always fits what is happening

  @AUD-022 @placeholder
  Scenario: Lengths
    Given the track list
    Then every loop lasts 60 to 150 seconds with an intro of 2 to 8 seconds
    And every stinger lasts 3 to 10 seconds
    And each loop plays one or two times before the next pick

  @AUD-023
  Scenario Outline: Interface and frame tracks
    When the screen "<screen>" opens
    Then the track "<track>" plays

    Examples:
      | screen | track |
      | title | title |
      | main_menu | title |
      | new_campaign | nation_select |
      | loading | load_resume |
      | game_over | game_over |
      | campaign_end | campaign_end |
      | credits | credits |

  @AUD-024
  Scenario: The nation picker swaps timbre
    Given "nation_select" is playing
    When the player highlights the country "Mali"
    Then the same notes play with the "west_africa" wavetable and tuning

  @AUD-025
  Scenario: Coming back to the app
    When the app comes back from the background
    Then "load_resume" plays its 6 second intro
    And then hands over to the normal pick

  @AUD-026
  Scenario Outline: Peace tracks per palette with era variants
    Given the palette is "west_africa" and the music era is <era>
    When a palette peace track is picked
    Then it is "<track>" in its Era <era> arrangement

    Examples:
      | era | track |
      | I | peace_westafrica_early |
      | III | peace_westafrica_early |
      | IV | peace_westafrica_late |
      | V | peace_westafrica_late |

  @AUD-027
  Scenario: Era themes are shared
    Given the music era is III
    Then the era theme "era_3" is the same for every nation

  @AUD-028 @AUD-029
  Scenario Outline: Situation tracks
    Given <condition>
    Then the track "<track>" plays

    Examples:
      | condition | track |
      | the realm book is open on its Diplomacy section in peace | diplomacy |
      | a plague event chain is active | crisis |
      | the player has explorers active and the camera is over open ocean | exploration |
      | a revolution period touches the player in Era IV | revolution |

  @AUD-029
  Scenario: Unrest adds a layer when rebels take the field
    Given the track "unrest" is playing
    When rebels are in the field
    Then the second layer of "unrest" comes in

  @AUD-030 @AUD-031 @placeholder
  Scenario Outline: War layers follow the war without restarting
    Given the player is at war and "war_campaign" plays
    And <condition>
    Then layers <layers> play, fading at bar lines

    Examples:
      | condition | layers |
      | no army is within 2 provinces of an enemy | 1 |
      | a player army is within 2 provinces of an enemy | 1 and 2 |
      | a player army is within 2 provinces of an enemy and a battle is fought this turn | 1, 2 and 3 |

  @AUD-032
  Scenario Outline: War percussion changes with the era
    Given the music era is <era>
    Then war percussion uses <drums>

    Examples:
      | era | drums |
      | I | frame drum |
      | III | field drum |
      | IV | snare and bass drum |
      | V | mechanized, noise-heavy patterns |

  @AUD-033 @AUD-034
  Scenario: A rival's declaration in the attacker's palette
    Given the player's palette is "mena"
    When the country "Hungary" declares war on the player
    Then the stinger "war_declared" plays in Hungary's palette "europe_east"

  @AUD-033
  Scenario Outline: Stingers on their moments
    When <moment>
    Then the stinger "<stinger>" plays

    Examples:
      | moment | stinger |
      | a battle result is shown as a victory | battle_won |
      | peace is signed with a gain | war_won |
      | a new sea route is discovered | discovery |
      | printing is adopted | innovation |
      | a new ruler takes power | ruler_new |
      | an alliance is signed | alliance |

  @AUD-035
  Scenario: First-release scope
    Given the first-release track list
    Then the first release has 47 loops and 21 stingers
