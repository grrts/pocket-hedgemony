@context-game-shell
Feature: Title and main menu
  As a player
  I want a short menu on the start screen
  So that I am back in my campaign in one tap

  # Since 18 October 2026 the title and the main menu are one start screen with
  # its menu already shown (start-screen.feature, SHELL-149 to SHELL-158). Its
  # background, column, icon row and Back are specified there; these scenarios
  # keep the main menu's rules that still hold (SHELL-023 to SHELL-029, SHELL-131).

  @SHELL-023 @SHELL-024
  Scenario Outline: More holds the secondary screens
    Given the game is "<edition>"
    And the tutorial is finished
    When the player opens "More" on the start screen
    Then "More" holds "<entries>"

    Examples:
      | edition         | entries                                                              |
      | the full game   | Settings, Achievements, Almanac, Unlock, Credits, Tutorial      |
      | the Steam demo  | Settings, Achievements, Almanac, Buy the full game, Credits, Tutorial |

  @SHELL-026 @SHELL-152
  Scenario Outline: First focus on the start screen
    Given <state>
    When the main menu opens
    Then focus is on "<focus>"

    Examples:
      | state                  | focus |
      | a campaign exists      | Play  |
      | no campaign exists     | Play  |

  @SHELL-027 @SHELL-152
  Scenario: First entry stands out
    Given a campaign exists
    When the main menu is shown
    Then "Play" is large and wax-red
    And the other entries are paper buttons

  @SHELL-028
  Scenario Outline: No ads in any edition
    Given the game is "<edition>"
    When the screen "<screen>" is shown
    Then no ad card is shown

    Examples:
      | edition                 | screen        |
      | the free mobile tier    | main_menu     |
      | the free mobile tier    | loading       |
      | the free mobile tier    | map           |
      | the free mobile tier    | game_menu     |
      | the free mobile tier    | final_result  |
      | the free mobile tier    | game_over     |
      | the Steam demo          | main_menu     |
      | the full game           | main_menu     |

  @SHELL-028
  Scenario: Never an ad in the Steam demo
    Given the game is the Steam demo
    When the main menu is shown
    Then no ad card is shown

  @SHELL-029 @SHELL-156
  Scenario: Full game ribbon in the free tier
    Given the game is the free tier
    When the main menu is shown
    Then a small "Full game" ribbon is shown
    And picking it opens the screen "unlock"
    And no pop-up about the full game is ever shown

  @SHELL-131
  Scenario Outline: The first-launch question
    Given the game is launched for the first time and no campaign exists
    When the player picks "Play" on the start screen
    Then the question "New to Pocket Hegemony?" is asked with "Play the tutorial, Guided campaign, I know the way"
    And focus is on "Play the tutorial"
    When the player picks "<choice>"
    Then <result>

    Examples:
      | choice            | result                                                        |
      | Play the tutorial | chapter 0 of the tutorial starts                              |
      | Guided campaign   | the screen "new_campaign" opens with guided first turns on    |
      | I know the way    | the screen "new_campaign" opens with guided first turns off   |

  @SHELL-131
  Scenario: The first-launch question is asked only once
    Given the first-launch question was answered
    When the game is started again and the player picks "Play"
    Then the screen "new_campaign" opens with no question
