@context-audio
Feature: Audio data, build checks and tools
  As the team
  I want tracks and sounds as reviewable text with strict build checks
  So that every sound stays inside the chip's rules and can be balanced without code

  @AUD-097 @AUD-098
  Scenario Outline: Track build checks
    Given an MML track file in "packages/rules/data/music/tracks/" that <fault>
    When the build compiles it to JSON
    Then the build fails

    Examples:
      | fault |
      | uses more voices than the budget |
      | puts a voice out of its range |
      | has a loop longer than 150 seconds |
      | never quotes the motif |
      | is named by the selector but missing |

  @AUD-099 @AUD-100
  Scenario Outline: Sound build checks
    Given a ".sfx" sound in "packages/rules/data/audio/sfx/" that <fault>
    When the build compiles it
    Then the build fails

    Examples:
      | fault |
      | uses four voices |
      | lasts 2.2 seconds and is not ambience |
      | is a ui_ sound of 10 ms |
      | is named by the director but missing |
      | lacks an era variant a troop type needs |
      | has no notification or animation named with it |

  @AUD-101
  Scenario: Balancing without code
    When the rotation weights in "music.yaml" change
    Then the director uses the new weights without a code change

  @AUD-102
  Scenario Outline: Event tags
    Given an event tagged <tag>
    When it opens
    Then <result>

    Examples:
      | tag | result |
      | music: event_major | the stinger "event_major" plays |
      | music: crisis | the crisis chain counts for the "crisis" state |
      | sfx: realm_plague | the sound "realm_plague" plays |

  @AUD-103
  Scenario Outline: Bindings map game events to sounds
    When the game event "<event>" happens
    Then the sound "<id>" plays

    Examples:
      | event | id |
      | turn.end_pressed | turn_end |
      | treasury.negative | econ_debt |
      | siege.terms | siege_terms |
      | achievement.unlocked | ui_achievement |
      | hint.shown | ui_hint |

  @AUD-129
  Scenario: The preview page
    When the team opens "/music.html"
    Then every track can be played with any palette, era variant and layer
    And the Effects tab lists every sound by group with any era variant
    And its "busy turn" button fires 40 battle results at once

  @AUD-130
  Scenario: Render to WAV
    When the render script is run on "peace_mena_early"
    Then a WAV file of the track is written

  @AUD-131
  Scenario: The diagnostics line
    Given the director debug overlay is on
    Then it shows the current state, track, layer and why it was chosen
    And it shows the last five effects, which were dropped and why
