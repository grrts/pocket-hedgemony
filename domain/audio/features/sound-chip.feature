@context-audio
Feature: The PH-5 sound chip
  As a player
  I want music and effects from one small 8-bit chip with honest limits
  So that the game sounds like one handheld everywhere and stays tiny to download

  @AUD-003
  Scenario: Everything is synthesized from note data
    Given the game is installed
    Then it ships no recorded audio files for music or effects
    And every sound is synthesized at runtime on the PH-5 chip

  @AUD-004 @AUD-005
  Scenario Outline: Music voices per era
    Given the music era is <era>
    Then the music may use at most <voices> voices at once
    And W2 is <w2>

    Examples:
      | era | voices | w2 |
      | I | 5 | not available |
      | IV | 5 | not available |
      | V | 6 | available for brass and string sections |

  @AUD-006 @AUD-008
  Scenario Outline: What the chip refuses
    When a track asks for <thing>
    Then the build refuses it

    Examples:
      | thing |
      | a sample of a real instrument |
      | a reverb tail |
      | a chord on one voice |
      | a sixth voice in Era III |

  @AUD-008 @placeholder
  Scenario Outline: The one short echo
    When a track uses an echo of <ms> ms
    Then the build <result> it

    Examples:
      | ms | result |
      | 60 | accepts |
      | 250 | accepts |
      | 400 | refuses |

  @AUD-007
  Scenario: Tuning tables per track
    Given the track "peace_mena_early" uses a maqam tuning table
    Then its scale degrees are stored in cents
    And neutral seconds and thirds play without 12-tone approximation

  @AUD-009 @AUD-010
  Scenario: Heard on a phone speaker
    Given a bass line on the triangle voice
    Then it sits an octave higher than a console would put it
    And the triangle keeps its stepped shape
    And the master mix passes a gentle low-pass at 9000 Hz

  @AUD-057 @AUD-058
  Scenario: Effects have their own three voices
    Given the music is playing all five voices
    When the player taps a button
    Then "ui_tap" plays on an effect voice
    And no music voice drops out

  @AUD-059 @AUD-060
  Scenario: A sound is a 60 Hz tick program
    Given the sound "ui_confirm"
    Then it is a sequence of 60 Hz ticks on S1 setting pitch, volume and duty
    And S3 may use any of the music's wavetables in other sounds

  @AUD-061 @placeholder
  Scenario: Effects bus
    Given effects are playing
    Then effects play on their own bus with their own volume
    And they pass the same 9000 Hz low-pass as the music
    And no effect pans more than 30 % off centre

  @AUD-062 @AUD-063
  Scenario Outline: Short, dry, audible effects
    Given the sound "<id>"
    Then it is shorter than 2 seconds
    And nothing important in it sits below 200 Hz

    Examples:
      | id |
      | ui_tap |
      | battle_gun |
      | realm_ruler_dies |
