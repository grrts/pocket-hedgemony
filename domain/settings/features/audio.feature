@context-settings
Feature: Audio settings
  As a player
  I want to set music, effects and ambience apart, and play with sound off
  So that the game sounds right wherever I play

  @SET-046
  Scenario Outline: Three buses
    Given the sound "<sound>" plays
    When the player lowers the volume of the bus "<bus>"
    Then the sound "<sound>" gets quieter

    Examples:
      | sound                | bus      |
      | a music track        | Music    |
      | a stinger            | Music    |
      | the End turn chime   | Effects  |
      | marching             | Effects  |
      | coins                | Effects  |
      | a tap                | Effects  |
      | the ambience bed     | Ambience |

  @SET-047 @SET-048 @SET-051 @SET-053
  Scenario Outline: Volume defaults
    Given the player has never changed audio
    When Audio is opened
    Then "<setting>" is <default>
    And it steps from 0 to 100 % in 5 % steps

    Examples:
      | setting          | default |
      | Master volume    | 80 %    |
      | Music volume     | 70 %    |
      | Effects volume   | 80 %    |
      | Ambience volume  | 50 %    |

  @SET-049
  Scenario: Music off suspends the synth
    Given "Music" is "On"
    When the player sets "Music" to "Off"
    Then the music synth is fully suspended

  @SET-050
  Scenario Outline: Music variety and zoom mix defaults
    Given the player has never changed audio
    When Audio is opened
    Then "<setting>" is "<default>" with the options "<options>"

    Examples:
      | setting        | default            | options                          |
      | Music variety  | My palette only    | My palette only, All palettes    |
      | Zoom mix       | On                 | On, Off                          |

  @SET-052
  Scenario: Interface sounds off keeps world effects
    Given "Interface sounds" is "Off"
    When the player taps a button and an army marches
    Then the tap is silent
    And the march is heard

  @SET-053
  Scenario Outline: Ambience on by default, its volume greyed while off
    Given "Ambience" is "<ambience>"
    When Audio is opened
    Then "Ambience volume" is <state>

    Examples:
      | ambience | state        |
      | Off      | greyed out   |
      | On       | usable       |

  @SET-054 @SET-060
  Scenario Outline: Haptics on phones only, one switch in two places
    Given the game runs on "<platform>"
    When the player opens Audio and Controls → Touch
    Then "Haptics" is <shown>

    Examples:
      | platform | shown                                       |
      | Android  | shown in both, as one switch, default On    |
      | iOS      | shown in both, as one switch, default On    |
      | desktop  | not shown                                   |

  @SET-055
  Scenario Outline: Sound in the background
    Given the game runs on "<platform>"
    And "Play sound in the background" is "<value>"
    When the game goes to the background
    Then the game is <result>

    Examples:
      | platform | value   | result  |
      | desktop  | Off     | silent  |
      | desktop  | On      | audible |
      | web      | On      | audible |
      | Android  | n/a     | silent  |

  @SET-056 @SET-120
  Scenario Outline: Other apps' audio
    Given the game runs on "iOS"
    And a podcast is playing
    And "Let other apps' audio play" was "<value>" when the game launched
    When the game starts
    Then <result>

    Examples:
      | value | result                                                    |
      | On    | game music starts muted and effects play over the podcast |
      | Off   | the game takes the audio over                             |

  @SET-056
  Scenario: Other apps' audio applies on restart
    Given the game runs on Android
    When the player changes "Let other apps' audio play"
    Then the change takes effect when the game next starts

  @SET-057
  Scenario Outline: Captions turn on when sound is silenced
    Given "Sound captions" is "Off"
    When the player <silences>
    Then "Sound captions" is "On"
    And a battle off screen at "Troyes" shows the caption "Battle at Troyes" at the screen edge toward it

    Examples:
      | silences                                    |
      | sets Master volume to 0                     |
      | sets every bus to 0 or off                  |

  @SET-058
  Scenario: Reduced intensity
    Given "Reduced intensity" is "On"
    When a priority 1 sound plays
    Then it plays 4 dB softer with no echo and no sharp attack

  @SET-059 @SET-060
  Scenario Outline: One switch in Audio and Accessibility
    Given the player sets "<setting>" to "On" in Audio
    When the player opens Accessibility
    Then "<setting>" is "On" there too

    Examples:
      | setting           |
      | Sound captions    |
      | Reduced intensity |
      | Mono audio        |
