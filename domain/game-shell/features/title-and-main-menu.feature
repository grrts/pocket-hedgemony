@context-game-shell
Feature: Title and main menu
  As a player
  I want a title that shows my own realm and a short menu
  So that I am back in my campaign in two taps

  @SHELL-016
  Scenario Outline: Title background drifts over the world map
    Given <campaign state>
    When the screen "title" is shown
    Then the background is the real map at world zoom drifting slowly over <region>
    And the map is drawn by the same renderer as the campaign map

    Examples:
      | campaign state                                        | region                                                         |
      | no campaign is in progress                             | a region of the 1444 world                                     |
      | the campaign as "France" in May 1503 is in progress    | the realm "France" in its current borders read from the latest save's summary |

  @SHELL-017
  Scenario Outline: Any input counts as Tap to start
    Given the screen "title" is shown
    When the player gives a "<input>"
    Then the main menu folds open
    And the track "title" starts

    Examples:
      | input             |
      | touch             |
      | click             |
      | key press         |
      | controller button |

  @SHELL-018
  Scenario Outline: Title corner controls
    Given the game runs on "<platform>"
    When the screen "title" is shown
    Then a settings cog is shown that opens the screen "settings" straight away
    And the version number is shown in a corner
    And the Quit cross <quit>

    Examples:
      | platform | quit         |
      | desktop  | is shown     |
      | Android  | is not shown |
      | iOS      | is not shown |

  @SHELL-019 @SHELL-118
  Scenario: The menu is the same screen as the title
    Given the screen "title" is shown
    When the player taps to start
    Then the "Tap to start" line folds open into the main menu in the same place
    When the player presses Back
    Then "Tap to start" is shown again

  @SHELL-004 @SHELL-020
  Scenario: Continue is two taps from a cold start
    Given a campaign as "France" exists with its newest save in May 1503
    When the player starts the game
    And the player taps to start
    Then the main menu shows "Continue" labelled "France · May 1503" with the banner of "France"
    When the player picks "Continue"
    Then the screen "loading" opens with the newest save
    And the map of "France" follows

  @SHELL-020 @SHELL-021 @SHELL-022 @SHELL-023 @SHELL-024 @SHELL-025
  Scenario Outline: Main menu entries
    Given <state>
    And the game runs on "<platform>"
    When the main menu is shown
    Then the main menu shows the entries "<entries>"

    Examples:
      | state                                                   | platform | entries                                                     |
      | no save exists and the tutorial is not finished          | Android  | New campaign, Tutorial, More                                |
      | a campaign and saves exist and the tutorial is finished  | Android  | Continue, New campaign, Load, More                          |
      | a campaign and saves exist and the tutorial is not finished | desktop | Continue, New campaign, Load, Tutorial, More, Quit         |
      | no save exists and the tutorial is finished               | Steam    | New campaign, More, Quit                                    |

  @SHELL-023 @SHELL-024
  Scenario Outline: More holds the secondary screens
    Given the game is "<edition>"
    And the tutorial is finished
    When the player opens "More" on the main menu
    Then "More" holds "<entries>"

    Examples:
      | edition         | entries                                                              |
      | the full game   | Settings, Achievements, Encyclopedia, Unlock, Credits, Tutorial      |
      | the Steam demo  | Settings, Achievements, Encyclopedia, Buy the full game, Credits, Tutorial |

  @SHELL-026 @open-question
  Scenario Outline: First focus on the main menu
    # OQ-SHELL-3: the source text for the no-campaign case is garbled
    Given <state>
    When the main menu opens
    Then focus is on "<focus>"

    Examples:
      | state                  | focus        |
      | a campaign exists      | Continue     |
      | no campaign exists     | New campaign |

  @SHELL-027
  Scenario: First entry stands out
    Given a campaign exists
    When the main menu is shown
    Then "Continue" is large and wax-red
    And the other entries are paper buttons

  @SHELL-028 @open-question
  Scenario Outline: The one ad in the free mobile tier
    # OQ-SHELL-16: whether the ad stays is gap list 3, item 2
    Given the game is the free mobile tier and keeps its one ad
    And <condition>
    When the screen "<screen>" is shown
    Then the ad card <shown>

    Examples:
      | condition                                   | screen        | shown        |
      | this is not the player's first session       | main_menu     | is shown in the corner opposite the menu, as one still and silent framed card covering no button |
      | this is the player's very first session      | main_menu     | is not shown |
      | the player has made any purchase             | main_menu     | is not shown |
      | this is not the player's first session       | loading       | is not shown |
      | this is not the player's first session       | map           | is not shown |
      | this is not the player's first session       | game_menu     | is not shown |
      | this is not the player's first session       | final_result  | is not shown |
      | this is not the player's first session       | game_over     | is not shown |

  @SHELL-028
  Scenario: Never an ad in the Steam demo
    Given the game is the Steam demo
    When the main menu is shown
    Then no ad card is shown

  @SHELL-029
  Scenario: Full game ribbon in the free tier
    Given the game is the free tier
    When the main menu is shown
    Then a small "Full game" ribbon is shown
    And picking it opens the screen "unlock"
    And no pop-up about the full game is ever shown
