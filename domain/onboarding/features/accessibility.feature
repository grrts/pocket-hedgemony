@context-onboarding
Feature: Tutorial accessibility and language
  As a player who needs larger text, less motion, or another language
  I want the tutorial to adapt
  So that every lesson can be followed

  @TUT-109
  Scenario: The note follows the UI scale
    Given the UI scale is at its largest
    Then the tutorial note's text follows the UI scale
    And the note may take up to two lines more

  @TUT-110
  Scenario: The lens lesson works without colour
    Given chapter 0's lens step
    Then it asks for the Food lens
    And hungry provinces carry the hunger icon as well as a colour

  @TUT-111
  Scenario: Reduced motion
    Given reduced motion is on
    Then the pointing hand doesn't bob
    And the spotlight doesn't pulse
    And the Varna battle in chapter 5 can be skipped to the result

  @TUT-112
  Scenario: Reading time
    Given a look step is shown
    When the player waits for 5 minutes
    Then the step has not advanced
    Given a watch step is playing
    Then the player can pause it

  @TUT-113
  Scenario: Translation keeps tokens and length
    Given the step text key "tut.ch3.open_food_policy" translated into another language
    Then the {ui:food_policy} token stays in the string where the translator put it
    And the step length lint checks the translation against 140 characters
