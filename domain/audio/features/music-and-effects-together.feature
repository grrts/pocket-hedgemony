@context-audio
Feature: Music and effects together
  As a player
  I want effects and stingers never to fight over the same moment
  So that big moments land cleanly

  @AUD-090
  Scenario Outline: Who owns which moment
    When <moment>
    Then the music plays "<music>"
    And the effects play <effects>

    Examples:
      | moment | music | effects |
      | war is declared on the player | war_declared | nothing |
      | the battle result is shown | battle_won | battle_rout before it, then silence |
      | peace is signed with a loss | war_lost | diplo_peace_signed first |
      | the ruler dies and an heir takes over | ruler_new | realm_ruler_dies first |
      | an age begins | age_<age_id> | nothing |

  @AUD-091 @placeholder
  Scenario Outline: Effects under a stinger
    Given a stinger is playing
    When an effect of priority <pri> starts
    Then it <result>

    Examples:
      | pri | result |
      | 1 | plays ducked by 4 dB |
      | 2 | plays ducked by 4 dB |
      | 3 | is dropped |
      | 5 | is dropped |

  # The rule also matches frame_logo, frame_campaign_begin and ui_purchase (OQ-AUD-8).
  @AUD-092 @placeholder @open-question
  Scenario Outline: Only long priority 1 effects duck music
    When "<id>" plays
    Then the music <result>

    Examples:
      | id | result |
      | battle_start | ducks by 4 dB for its length |
      | realm_ruler_dies | ducks by 4 dB for its length |
      | turn_end | does not duck |
      | ui_achievement | does not duck |

  @AUD-093 @placeholder
  Scenario: Ambience steps back
    Given ambience is on
    When an effect of priority 2 plays
    Then the ambience ducks by 6 dB
    When a music track starts
    Then the ambience fades out over 2 seconds

  # frame_pause ducking sits outside the effects ducking rule (OQ-AUD-8).
  @AUD-094 @open-question
  Scenario: The pause menu ducks the music
    When the pause menu opens
    Then "frame_pause" plays
    And the music ducks by 6 dB while paused

  @AUD-095 @placeholder
  Scenario: Loudness
    Given music and effects are playing at default volumes
    Then a "ui_tap" sits about 6 dB below the music's average
    And a priority 1 sound peaks about 3 dB above it
    And the whole mix targets -16 LUFS

  @AUD-096
  Scenario: Several achievements in one turn
    When three achievements unlock in one turn
    Then "ui_achievement" plays once
