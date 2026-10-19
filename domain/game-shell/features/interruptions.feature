@context-game-shell
Feature: Interruptions
  As a player on a phone
  I want the game to survive calls, locks, kills, purchases and crashes
  So that I never lose my place

  Background:
    Given a campaign as "Portugal" is loaded

  @SHELL-101
  Scenario: Going to the background
    Given the player has given orders since the last save
    When the app goes to the background
    Then the orders journal is written
    And sound is suspended

  @SHELL-101
  Scenario: Nothing changed, nothing saved
    Given nothing changed since the last save
    When the app goes to the background
    Then no save is written
    And sound is suspended

  @SHELL-102
  Scenario Outline: Coming back while in memory
    Given the player was on the tab "Military" of the Realm book scrolled halfway
    When <event>
    Then the tab "Military" of the Realm book is shown at the same scroll and camera
    And the screen "title" is not shown
    And the track "load_resume" plays

    Examples:
      | event                                          |
      | the app comes back while still in memory       |
      | the Steam Deck resumes from suspend            |

  @SHELL-103
  Scenario: Closed by the system in the background
    Given the app went to the background
    And the system closed the app
    When the player starts the game
    Then the screen "boot" is shown
    And "Play" points at the save written when the app went to the background
    When the player continues
    Then the map shows the strip "Picked up where you left off"

  @SHELL-104
  Scenario Outline: A turn running when the app leaves
    Given a turn is being worked out
    When the app goes to the background and <then>
    Then <result>

    Examples:
      | then                     | result                                         |
      | comes back               | the worker paused with the app and the turn carries on |
      | is killed and restarted  | the Resume save and the orders journal are used |

  @SHELL-105
  Scenario Outline: The unlock flow returns where it was opened
    Given the game is the free tier
    And the unlock flow was opened from <place>
    When the purchase <outcome>
    Then <place> is shown again
    And <extra>

    Examples:
      | place                          | outcome    | extra                                         |
      | the realm picker on "Castile"  | succeeds   | the realm "Castile" is chosen                 |
      | the main menu                  | succeeds   | every realm is unlocked                       |
      | the realm picker on "Castile"  | is cancelled | no message beyond the store's own is shown  |
      | the main menu                  | fails      | no message beyond the store's own is shown    |

  @SHELL-106
  Scenario: Unlock offline
    Given the device is offline
    When the player opens the unlock flow
    Then it shows "No connection: try again later"
    And nothing else in the game is blocked

  @SHELL-107 @SHELL-011
  Scenario Outline: Something went wrong
    Given <failure>
    And a crash reporter <approved>
    When the failure happens
    Then the screen "error" says what failed in plain words
    And it offers "<options>"
    And no stack trace is shown

    Examples:
      | failure                         | approved           | options                                              |
      | the engine worker crashes       | is approved        | Restore the last save, Main menu, Send a report  |
      | a save won't read               | is not approved    | Restore the last save, Main menu                 |

  @SHELL-135
  Scenario Outline: The Unlock screen
    Given the game runs on "<platform>"
    When the player opens the screen "unlock"
    Then it offers one purchase, the full game, which unlocks every realm
    And it shows the store's price and the buttons "<buttons>"

    Examples:
      | platform | buttons                  |
      | Android  | Buy, Restore purchases   |
      | Steam    | Buy                      |
