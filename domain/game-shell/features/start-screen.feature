@context-game-shell
Feature: Start screen
  As a player
  I want the game to open on a start screen with a Play button over my moving map
  So that one tap takes me into my campaign and everything else is one tap away

  # Leroy, 18 October 2026: replaces Tap to start (SHELL-017, SHELL-019).

  @SHELL-149
  Scenario: The start screen opens with its menu shown
    Given the game has booted and the first-run questions are answered
    When the start screen opens
    Then the start screen shows its menu without waiting for a tap
    And focus is on "Play"
    When the player first touches the start screen
    Then the track "title" starts

  @SHELL-150 @placeholder
  Scenario Outline: The map pans behind the start screen at region zoom
    Given <campaign state>
    When the start screen opens
    Then the background is the real map at region zoom panning slowly over <region>
    And the background takes no input and runs no simulation
    # shell.start_zoom, shell.start_pan_speed, shell.start_regions

    Examples:
      | campaign state                                      | region                                                             |
      | no campaign is in progress                           | one of the 1444 regions listed in the start regions                |
      | the campaign as "France" in May 1503 is in progress  | the realm "France" in its borders and season from the latest save's summary |

  @SHELL-151
  Scenario: Battery saver keeps the map moving
    Given Battery saver is on
    When the start screen opens
    Then the background still pans at Battery saver's frame rate

  @SHELL-152
  Scenario Outline: The column of ways into a campaign
    Given <state>
    When the start screen opens
    Then the column shows "<entries>"
    And "Play" is large and wax-red

    Examples:
      | state                                                        | entries                              |
      | no save exists and the tutorial is not finished               | Play, Tutorial                       |
      | a campaign and saves exist and the tutorial is not finished   | Play, New campaign, Load, Tutorial   |
      | a campaign and saves exist and the tutorial is finished       | Play, New campaign, Load             |

  @SHELL-153 @SHELL-004
  Scenario: Play continues the campaign in progress
    Given a campaign as "France" exists with its newest save in May 1503
    When the start screen opens
    Then "Play" shows the banner of "France" and "France · May 1503" under it
    When the player picks "Play"
    Then the screen "loading" opens with the newest save

  @SHELL-153 @SHELL-131
  Scenario: Play with no campaign opens New campaign
    Given no campaign exists and the first-launch question was answered
    When the player picks "Play" on the start screen
    Then the screen "new_campaign" opens

  @SHELL-154
  Scenario Outline: The icon row
    Given the game runs on "<platform>"
    When the start screen opens
    Then the icon row shows "<icons>", each with its name

    Examples:
      | platform | icons                                            |
      | Android  | Settings, Achievements, Wiki, More               |
      | iOS      | Settings, Achievements, Wiki, More               |
      | desktop  | Settings, Achievements, Wiki, More, Quit         |
      | Steam    | Settings, Achievements, Wiki, More, Quit         |

  @SHELL-155
  Scenario: The Wiki opens in the browser
    Given the start screen is shown
    When the player picks "Wiki"
    Then the system browser opens the wiki address
    And the game stays on the start screen

  @SHELL-156
  Scenario: Version and Full game ribbon
    Given the game is the free tier
    When the start screen opens
    Then the version number is shown in the lower right corner
    And the "Full game" ribbon is shown beside the logo

  @SHELL-157
  Scenario Outline: Back on the start screen
    Given the game runs on "<platform>"
    And the start screen is shown with nothing over it
    When the player presses Back
    Then <result>

    Examples:
      | platform | result                    |
      | Android  | the app is left           |
      | desktop  | the start screen stays    |

  @SHELL-158
  Scenario: Exit to main menu returns to the start screen
    Given a campaign as "France" is being played
    When the player picks "Exit to main menu" and it is done
    Then the start screen opens
    And the background pans over the realm "France"
