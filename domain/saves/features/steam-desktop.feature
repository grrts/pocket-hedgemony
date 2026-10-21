@context-saves
Feature: Steam on the desktop
  As a player who bought the game on Steam
  I want the game to sign me in with Steam and keep my saves as files Steam Cloud can carry
  So that I never type a password and my campaign follows me to my Steam Deck

  @SAVE-140
  Scenario Outline: Without Steam the desktop game plays as before
    Given the desktop game starts with <app id>
    And <steam>
    When the game looks for Steamworks
    Then the game runs as the desktop game without Steam
    And email sign-in and the save folder work as before
    And no error is shown to the player

    Examples:
      | app id                     | steam                                   |
      | no Steam app id            | the Steam client is running             |
      | the Steam app id 480       | the Steam client is not running         |
      | the Steam app id 480       | the steamworks.js library is not there  |

  @SAVE-141 @SAVE-113
  Scenario: The Steam build signs in by itself
    Given the Steam build starts with the Steam client running as "Bertrand"
    And the device is signed out
    When the game starts
    Then the game asks Steamworks for a Web API ticket for the identity "pockethegemony"
    And it signs in with that ticket and the display name "Bertrand"
    And the player has typed nothing

  @SAVE-141
  Scenario: A player who signed out is not signed in again
    Given the Steam build is signed in with Steam
    When the player taps Sign out of this device
    And the game starts again
    Then the device stays signed out
    And the Account and cloud saves card offers Sign in with Steam

  @SAVE-141 @SAVE-118
  Scenario Outline: A silent sign-in that fails says nothing at launch
    Given the Steam build starts signed out
    When the silent Steam sign-in fails because <reason>
    Then nothing is shown over the game at launch
    And the Account and cloud saves card shows "<message>" under Sign in with Steam

    Examples:
      | reason                      | message                                                       |
      | the server cannot be reached | Can't reach the server. Check the connection and try again. |
      | Steam refuses the ticket     | Steam did not accept the sign-in.                           |
      | the server has no Steam key  | Steam sign-in is not available.                             |

  @SAVE-142
  Scenario: A Steam Deck names itself
    Given the Steam build runs on a Steam Deck
    When the game signs in and writes a save
    Then the device appears in the account's device list as "Steam Deck" on the platform "steam"
    And the save's header names the device "Steam Deck"
    And Continue on another device says "from Steam Deck"

  @SAVE-143 @SAVE-057
  Scenario: The device token on the desktop
    Given the desktop game is signed in
    When the device token is kept
    Then it is encrypted with Electron's safeStorage in the userData folder
    But where safeStorage cannot encrypt, it stays in the game's web storage

  @SAVE-144 @SAVE-032 @SAVE-053
  Scenario: Saves are files in the save folder
    Given the desktop game
    When the game writes a save of the campaign "c1" with the save id "s1" at 1700000000000
    Then the file "c1/1700000000000-s1.phsave" is in the save folder
    And it was written as a ".tmp" file, flushed and renamed before the saves it replaces were removed
    And the Load card lists it by reading only its header

  @SAVE-144
  Scenario: Saves kept in IndexedDB move into the folder once
    Given an earlier desktop build kept 3 saves in IndexedDB
    When the game first starts with the save folder
    Then the 3 saves are files in the save folder
    And IndexedDB no longer holds them

  @SAVE-145 @SAVE-073
  Scenario: The Auto-Cloud settings in the partner site
    # config key: cloud.store_backups.steam.partner_site
    Given the game runs on Steam
    Then the Auto-Cloud root is "WinAppDataRoaming" with the subdirectory "Pocket Hegemony/saves"
    And the Auto-Cloud pattern is "*.phsave", recursive, for every OS
    And on macOS the root is overridden to "MacAppSupport" with the same path
    And on Linux the root is overridden to "LinuxHome" with the path ".config/Pocket Hegemony/saves"
    And the desktop app's product name is "Pocket Hegemony"

  @SAVE-146 @SAVE-147
  Scenario: The Account card shows Steam as the sign-in
    Given the Steam build is signed in with Steam as "Bertrand" with no email
    When the player opens Settings → Account and cloud saves
    Then under the display name it says "Signed in with Steam"
    And the Sign-ins row lists "Steam" with "Bertrand" first

  @SAVE-148
  Scenario: The card on a Steam Deck
    Given the Steam build runs on a Steam Deck in landscape
    When the player opens Settings → Account and cloud saves while signed out
    Then the card is one scrolling column inside the safe areas
    And Sign in with Steam fills the width and is 48 points high
    And nothing needs hover
