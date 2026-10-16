@context-game-shell
Feature: Game menu
  As a player
  I want one menu in the campaign for saving, loading, settings and leaving
  So that leaving or adjusting never costs me a turn

  Background:
    Given a campaign as "France" is loaded
    And the screen "map" is shown with nothing open

  @SHELL-064
  Scenario Outline: Ways to open the game menu
    When the player <action>
    Then the screen "game_menu" opens as a modal over the dimmed map
    And the turn is not paused, because nothing runs until End turn

    Examples:
      | action                                    |
      | presses the game menu button              |
      | presses Back                              |
      | presses Esc                               |
      | presses the controller's Menu button      |

  @SHELL-065
  Scenario Outline: Game menu entries by platform
    Given the game runs on "<platform>"
    When the screen "game_menu" opens
    Then it shows the entries "<entries>" in order
    And focus is on "Return to the map"

    Examples:
      | platform | entries                                                                                 |
      | Android  | Return to the map, Save, Load, Settings, Encyclopedia, Achievements, Exit to main menu   |
      | desktop  | Return to the map, Save, Load, Settings, Encyclopedia, Achievements, Exit to main menu, Quit |
      | Steam    | Return to the map, Save, Load, Settings, Encyclopedia, Achievements, Exit to main menu, Quit |

  @SHELL-066
  Scenario: Ironman save entry
    Given the campaign is ironman
    When the screen "game_menu" opens
    Then the Save entry reads "Save and quit"

  @SHELL-067
  Scenario: Settings returns to the game menu
    Given the screen "game_menu" is open
    When the player picks "Settings"
    Then the screen "settings" opens as an overlay
    When the player closes the screen "settings"
    Then the screen "game_menu" is shown

  @SHELL-068 @SHELL-005
  Scenario Outline: Leaving asks only when turns would be lost
    Given the campaign <ironman>
    And the campaign <unsaved> unsaved turns
    When the player picks "<entry>"
    Then <result>

    Examples:
      | ironman       | unsaved | entry             | result                                       |
      | is not ironman | has     | Exit to main menu | a question about the unsaved turns is shown  |
      | is not ironman | has no  | Exit to main menu | the main menu is shown without a question    |
      | is not ironman | has     | Quit              | a question about the unsaved turns is shown  |
      | is ironman     | has     | Exit to main menu | the game saves and the main menu is shown without a question |
