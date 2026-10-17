@context-saves
Feature: Store backups, Export and Import
  As a player who never signs in
  I want my saves backed up by my store and movable as files
  So that a new device or a bug report still has my campaign

  @SAVE-073 @placeholder
  Scenario: Steam Auto-Cloud
    # config key: cloud.store_backups.steam
    Given the game runs on Steam
    When the game writes saves to "Electron userData/saves"
    Then Steam Auto-Cloud covers the synced set in that folder
    And root overrides map the Windows, macOS and Linux paths onto one cloud folder
    And the quota is 500 MB and 2,000 files
    And Dynamic Cloud Sync uploads saves of a suspended Deck after the suspend hook has written them

  @SAVE-073
  Scenario: Steam Cloud and our server share the folder without clashes
    Given the player is signed in and uses Steam Auto-Cloud
    When both add files to the save folder
    Then no two files share a name
    And Steam's conflict dialog does not appear

  @SAVE-074
  Scenario: Android Auto Backup
    Given the game runs on Android
    When Auto Backup runs
    Then it includes the synced set through the backup rules file within 25 MB
    And it excludes the orders journal

  @SAVE-075
  Scenario: iOS device backup
    Given the game runs on iOS
    When the device makes its iCloud backup
    Then the save folder is included

  @SAVE-076
  Scenario: Web saves
    Given the game runs on the web
    When the game starts
    Then saves live in IndexedDB
    And the game asks for persistent storage
    And no store backup exists, so signing in is how the player keeps saves

  @SAVE-077
  Scenario: No native cloud plugins
    Given the game runs on Android or iOS
    When saves are backed up
    Then Play Games saved games and an iCloud Documents container are not used

  @SAVE-078
  Scenario Outline: Export
    Given the game runs on "<platform>"
    When the player exports the save "Castile, May 1492"
    Then a ".phsave" file is offered through <way>

    Examples:
      | platform | way                 |
      | Android  | the share sheet     |
      | iOS      | the share sheet     |
      | desktop  | a save dialog       |

  @SAVE-079
  Scenario Outline: Import
    Given a ".phsave" file with <state>
    When the player imports it from <source>
    Then <result>

    Examples:
      | state                                  | source            | result                                    |
      | a good magic, CRCs and worldHash       | the file picker   | it joins the Manual saves                 |
      | a good magic, CRCs and worldHash       | Files             | it joins the Manual saves                 |
      | a good magic, CRCs and worldHash       | a download        | it joins the Manual saves                 |
      | a wrong magic                          | the file picker   | it is rejected                            |

  @SAVE-079 @SAVE-081
  Scenario: Imported saves face the nation lock
    Given the game is the free mobile tier
    And a ".phsave" file of the nation "Portugal" with needsFullGame true
    When the player imports and opens it
    Then the unlock screen is shown
