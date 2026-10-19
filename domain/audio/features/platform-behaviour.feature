@context-audio
Feature: Audio on each platform
  As a player on a phone, a computer or a Steam Deck
  I want sound that starts properly, stops in the background and respects my device
  So that the game behaves like a good app

  @AUD-104 @AUD-105
  Scenario Outline: The synth path
    Given the AudioWorklet <state>
    When music starts
    Then the voices run <path>

    Examples:
      | state | path |
      | starts | in the AudioWorklet fed about 100 ms ahead by the scheduler |
      | can't start | on OscillatorNode with PeriodicWave and a looping noise buffer |

  @AUD-106 @placeholder
  Scenario: CPU budget
    When the smoke test runs with music and effects on, on a mid-range phone
    Then audio uses under 2 % of one core

  @AUD-107 @AUD-108
  Scenario Outline: The first tap
    Given a cold start on "<platform>"
    Then <splash>
    And "frame_start" plays on "Tap to start"

    Examples:
      | platform | splash |
      | iOS | the splash is silent |
      | Android | the splash is silent |
      | Steam | "frame_logo" plays on the splash |

  @AUD-109 @AUD-110
  Scenario: Background and return
    Given music is playing
    When the app goes to the background
    Then the AudioContext is suspended and music and effects stop
    When two notifications arrive while away and the app returns
    Then "load_resume" plays
    And the two notifications play no sound

  @AUD-111
  Scenario: The iPhone silent switch
    Given the iPhone's silent switch is on
    Then the game uses the native "ambient" audio session, which respects the silent switch
    And it mixes with the player's other audio apps
    And music and effects follow the same audio session setting

  @AUD-109
  Scenario Outline: Playing in the background on desktop
    Given the game runs on "<platform>" with "play in background" <setting>
    When the window is hidden
    Then the audio <result>

    Examples:
      | platform | setting | result |
      | Steam | off | is suspended |
      | Steam | on | keeps playing |
      | web | on | is suspended |

  @AUD-112
  Scenario Outline: Haptics on phones
    Given haptics are on and the device is a phone
    When "<sound>" plays
    Then the phone gives a <strength> vibration

    Examples:
      | sound | strength |
      | ui_error | light |
      | turn_ready | light |
      | battle_start | light |
      | siege_breach | light |
      | realm_ruler_dies | light |

  @AUD-112
  Scenario: Haptics work with sound off and never on desktop
    Given the master volume is 0 on a phone with haptics on
    When a battle starts
    Then the phone vibrates
    Given the game runs on desktop
    Then no haptics are used

  @AUD-113 @placeholder
  Scenario: Low-latency taps
    When the player taps a button
    Then "ui_tap" starts within one audio block, about 3 ms at 128 samples
    And it bypasses the 100 ms lookahead scheduler

  @AUD-113
  Scenario: Battle sounds line up with animation
    When a battle's sounds play on the map
    Then they go through the scheduler in step with the animation

  @AUD-114 @AUD-115 @placeholder
  Scenario: Audio settings and defaults
    Given a fresh install on a phone
    Then master volume is 0.8
    And music volume is 0.7, effects volume 0.8 and ambience volume 0.5
    And the variety is "own palette only"
    And interface sounds are on, haptics are on, ambience is on
    And mono, sound captions and reduced intensity are off
    When the player turns music off
    Then the synth's music is fully suspended
