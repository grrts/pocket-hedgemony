@context-onboarding
Feature: One lesson on every input
  As a player on a phone, a computer or a controller
  I want the tutorial to speak about the input I am using
  So that every lesson works on my device

  @TUT-006 @TUT-098
  Scenario: Tokens become prompts and swap live
    Given a step text "{btn:confirm} to continue."
    And the player last used touch
    When the player picks up a controller mid-step and presses a button
    Then the prompt swaps to the controller's confirm glyph at once

  @TUT-099
  Scenario Outline: Glyphs by controller family
    Given the player uses a "<controller>" controller
    Then the prompts use the "<glyphs>" glyphs

    Examples:
      | controller | glyphs |
      | Xbox | Xbox |
      | PlayStation | PlayStation |
      | Steam Deck | Steam Controller and Steam Deck |
      | unknown | generic |

  @TUT-099
  Scenario: Steam Input's own glyphs on Steam
    Given the game runs on Steam with Steam Input
    Then the prompts use Steam Input's own glyphs

  @TUT-100
  Scenario Outline: The tutorial's actions per device
    When the player does "<action>" on "<input>"
    Then the game takes it as <how>

    Examples:
      | action | input | how |
      | End turn | touch | the hourglass button, lower right |
      | End turn | mouse and keyboard | Enter |
      | End turn | controller | holding Menu / Options for half a second |
      | Skip a tutorial step | controller | holding B / Circle for one second |
      | Cycle my armies | mouse and keyboard | Tab |
      | Zoom | touch | pinch, or double-tap to zoom in |

  @TUT-101
  Scenario: Focus starts where the step wants it
    Given the player uses a controller
    When a step that wants the Food policy button is shown
    Then focus starts on the Food policy button
    And the spotlight follows the focused element as the d-pad moves

  @TUT-102
  Scenario: No text entry in the tutorial
    Given any tutorial chapter
    Then no step asks the player to type text

  @TUT-103
  Scenario Outline: Chapter 0 has a script per input
    Given the player starts chapter 0 using "<input>"
    Then the chapter 0 script for "<input>" asks the player to try each camera action once

    Examples:
      | input |
      | touch |
      | mouse and keyboard |
      | controller |
