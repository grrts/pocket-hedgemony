@context-settings
Feature: Where settings are stored and how they sync
  As a player with a phone and a Steam Deck
  I want my personal preferences to follow me while each device keeps its own graphics and volumes
  So that both devices feel like mine

  @SET-023
  Scenario Outline: Two groups
    Given the player has changed the setting "<setting>"
    When the setting "<setting>" is stored
    Then it is in the group "<group>"

    Examples:
      | setting               | group    |
      | Map detail            | Device   |
      | Master volume         | Device   |
      | Screen margins        | Device   |
      | Stick deadzone        | Device   |
      | Battery saver         | Device   |
      | Confirm End turn      | Personal |
      | Colour vision         | Personal |
      | Language              | Personal |
      | Key bindings          | Personal |
      | Tutorial hints        | Personal |

  @SET-024
  Scenario: Two files with versions
    Given the player has changed settings in both groups
    When the settings are saved
    Then "settings-device.json" and "settings-personal.json" are written
    And each holds a version number

  @SET-025 @open-question
  Scenario: Signed in, personal settings sync setting by setting
    # OQ-SET-13: the saves design does not yet carry settings
    Given the player is signed in on a "Steam Deck" and a "Pixel 8"
    And on the "Steam Deck" the player set "Font" to "Plain" at 10:00
    And on the "Pixel 8" the player set "Date format" to "1444-10-16" at 10:05
    And on the "Pixel 8" the player set "Font" to "Pixel" at 09:50
    When both devices sync
    Then both devices have "Font" "Plain" and "Date format" "1444-10-16"
    And the "Steam Deck" keeps its own "Map detail"

  @SET-026 @SET-027
  Scenario Outline: Not signed in, the store backup carries settings
    Given the player is not signed in on "<platform>"
    When the settings are saved
    Then they live in <location>
    And <backup>

    Examples:
      | platform | location                    | backup                                                         |
      | Steam    | app.getPath("userData")     | Steam Auto-Cloud carries settings-personal.json next to the save folder |
      | iOS      | Capacitor Preferences       | the device's iCloud backup restores both files on a new device, with no live sync |
      | Android  | Capacitor Preferences       | Android Auto Backup restores both files on a new phone, with no live sync |
      | web      | localStorage                | nothing backs them up                                          |

  @SET-028
  Scenario Outline: Reading a damaged or old file
    Given "settings-personal.json" holds <content>
    When the game starts
    Then <result>
    And the game starts normally

    Examples:
      | content                                  | result                                         |
      | the unknown key "old.thing"              | the key is dropped                             |
      | "Text size" set to "Huge"                | "Text size" uses its profile default           |
      | broken JSON                              | every setting uses its profile default         |

  @SET-029
  Scenario: File versions migrate
    Given "settings-personal.json" has an older version number
    When the game reads it
    Then migration steps rename or convert its keys to the current version

  @SET-030
  Scenario: Loading a save never changes settings
    Given the player's "Text size" is "Larger"
    When the player loads a friend's save made with "Text size" "Normal"
    Then the player's "Text size" is still "Larger"
    And only the campaign rules of that save are used

  @SET-031
  Scenario: Buying the full game keeps settings
    Given the free tier player has changed 5 settings
    When the player buys the full game
    Then the 5 settings are unchanged
