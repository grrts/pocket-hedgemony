@context-audio
Feature: Audio accessibility
  As a deaf player, a player on a bus, or a player with one ear
  I want every sound to have a visual partner and the mix to adapt
  So that I miss nothing

  @AUD-116
  Scenario: Every sound has a visual partner
    When "notify_battle_far" plays
    Then a toast shows the battle as well

  @AUD-117
  Scenario: Captions point to off-screen sounds
    Given sound captions are on
    When a battle starts off screen at "Troyes" to the left
    Then a small caption "Battle at Troyes" with crossed swords shows at the left edge

  @AUD-118
  Scenario Outline: Captions turn on when sound is off
    Given sound captions were never set
    When the player <action>
    Then sound captions turn on

    Examples:
      | action |
      | sets the master volume to 0 |
      | turns every bus off |

  @AUD-119
  Scenario: Mono audio
    Given mono audio is on
    When a sound plays at the right of the screen
    Then it plays without pan

  @AUD-120
  Scenario: Gain and loss differ by more than pitch
    Given the pair "realm_stability_up" and "realm_stability_down"
    Then they differ in rhythm or timbre as well as pitch

  @AUD-121 @placeholder
  Scenario: Reduced intensity
    Given reduced intensity is on
    When "battle_start" plays
    Then it is 4 dB softer and has no echo
    And "battle_shoot_mg" plays without its stutter
