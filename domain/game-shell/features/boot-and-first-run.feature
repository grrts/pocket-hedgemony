@context-game-shell
Feature: Boot and first-run questions
  As a player
  I want the game to open quickly and ask only what the law or the platform needs
  So that my first minute is the game, not forms

  @SHELL-008
  Scenario: Boot shows the logo while the game loads
    Given the game is not running
    When the player starts the game
    Then the screen "boot" shows the pixel logo on parchment with the hourglass turning
    And no studio logo and no video is shown
    And the screen "boot" stays up while the map, sprites and engine worker load

  @SHELL-009
  Scenario Outline: Native launch screen matches the boot logo
    Given the game runs on "<platform>"
    When the player starts the game
    Then the native launch screen shows the same logo as the screen "boot"

    Examples:
      | platform |
      | iOS      |
      | Android  |

  @SHELL-010 @placeholder
  Scenario Outline: Boot never flashes
    # config key: shell.boot_min_seconds
    Given loading takes <load> seconds
    When the player starts the game
    Then the screen "boot" is shown for <shown> seconds

    Examples:
      | load | shown |
      | 0.2  | 0.6   |
      | 0.6  | 0.6   |
      | 2.5  | 2.5   |

  @SHELL-011
  Scenario Outline: Loading failure shows the failure screen
    Given <failure>
    When the player starts the game
    Then the screen "error" is shown

    Examples:
      | failure                                                                 |
      | a needed file is missing                                                |
      | the engine worker won't start and the main-thread fallback also fails   |

  @SHELL-012 @SHELL-005
  Scenario: First-run questions appear once, before the title
    Given the game runs for the first time
    And the device language is not one the game has
    When the screen "boot" finishes
    Then the screen "first_run" shows one card with one choice
    And the screen "title" follows once every card is answered
    When the player starts the game a second time
    Then the screen "first_run" is not shown

  @SHELL-013
  Scenario Outline: The language card appears only when needed
    Given the game runs for the first time
    And the device language is "<device language>"
    And the game has the languages "English, French"
    When the screen "boot" finishes
    Then the language card <shown>
    And the game language is "<used>"

    Examples:
      | device language | shown          | used          |
      | French          | is not shown   | French        |
      | Turkish         | is shown       | chosen on card |

  @SHELL-014
  Scenario Outline: The consent card appears only where something needs consent
    Given the game runs for the first time on the store "<store>"
    And on that store <collected> is collected
    When the screen "boot" finishes
    Then the consent card <shown>

    Examples:
      | store       | collected                       | shown        |
      | Google Play | the free mobile tier's ad        | is shown     |
      | App Store   | crash reports needing consent    | is shown     |
      | Steam       | nothing that needs consent       | is not shown |

  @SHELL-015
  Scenario: No sign-in before play
    Given the game runs for the first time
    And the device is offline
    When the player goes from the screen "boot" to the map of a new campaign
    Then no account sign-in is asked at any step
    And the campaign plays offline
