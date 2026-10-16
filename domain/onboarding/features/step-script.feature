@context-onboarding
Feature: Tutorial steps and how they look
  As a new player
  I want each step to name one thing, sit out of the way and end in a clear way
  So that I always know what to do next

  @TUT-001 @TUT-002 @TUT-003 @TUT-054
  Scenario: Steps teach one thing on the real screens
    Given the step "ch3.open_food_policy" of kind "do"
    Then its text key "tut.ch3.open_food_policy" reads "Your castles feed the land around them. Open {ui:food_policy}."
    And its anchor is "ui.country_card.food"
    And it ends when the screen "food_policy" is open
    And its guide face is the vizier
    And its text is at most 140 characters

  @TUT-055 @TUT-056 @TUT-057 @TUT-058
  Scenario Outline: How each kind of step ends
    Given a step of kind "<kind>"
    Then it ends <ending>

    Examples:
      | kind | ending |
      | look | when the player presses {btn:confirm} or taps anywhere |
      | do | when its condition is met, with no Next button |
      | choose | when the player makes any choice, and the next step reacts to which |
      | watch | when the turn or battle it plays ends |

  @TUT-059
  Scenario Outline: Text tokens
    Given a step text with the token "<token>"
    Then the note shows <shown>

    Examples:
      | token | shown |
      | {btn:confirm} | the prompt for the player's current input |
      | {ui:food_policy} | the screen's name in bold with its icon |
      | {stat:gold} | the stat's icon and name, linked to its Almanac entry |
      | {place:edirne} | the name "Edirne", linked, moving the camera there when tapped |
      | {lord:turahan} | the name "Turahan", linked, moving the camera there when tapped |

  @TUT-060
  Scenario Outline: The note never covers the target
    Given the step's target is <position> on the screen
    Then the note sits at the <edge> edge
    And it takes at most a third of the screen height

    Examples:
      | position | edge |
      | high | bottom |
      | low | top |

  @TUT-061 @TUT-062 @TUT-063
  Scenario: Spotlight, face and counter
    Given the second of six steps of chapter 0 is shown on "Edirne"
    Then the rest of the screen is dimmed to 50 %, not black
    And the note shows the face of the grand vizier Çandarlı Halil
    And the counter reads "2 / 6"

  @TUT-064
  Scenario: The pause menu in the tutorial
    Given the tutorial is running
    When the player opens the pause menu
    Then it shows the lines "Skip this chapter", "Chapter list" and "Leave the tutorial"
