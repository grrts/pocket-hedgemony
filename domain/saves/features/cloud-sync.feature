@context-saves
Feature: Cloud saves on the Pocket Hegemony server
  As a player with several devices
  I want one optional account to carry my campaigns across every store
  So that I can play on a Steam Deck and continue on my phone

  @SAVE-052
  Scenario: Cloud is optional and the game plays offline
    Given the player has no account
    And the device is offline
    When the player plays and saves a campaign
    Then everything works except cloud sync

  @SAVE-052 @SAVE-053
  Scenario: Two devices that played offline keep both sets
    Given the player is signed in on a "Steam Deck" and a "Pixel 8"
    And both played different campaigns offline
    When both come online and sync
    Then each device's Load screen shows the saves of both, each marked with the device that made it
    And Continue picks the newest of them
    And every file name has the form "campaignId/savedAt-saveId.phsave"

  @SAVE-054
  Scenario: Two lines of one campaign are not an error
    Given the non-ironman campaign as "Portugal" was continued offline on a "Steam Deck" and on a "Pixel 8"
    When both sync
    Then both lines of play are kept
    And the Load screen shows them as separate saves
    And no error is shown

  @SAVE-055
  Scenario Outline: What is synced
    Given the player is signed in
    And the campaign has a "<save>"
    When the device syncs
    Then that save is <synced>

    Examples:
      | save                           | synced           |
      | manual save                    | uploaded         |
      | latest Resume save             | uploaded         |
      | latest ironman save            | uploaded         |
      | newest autosave                | uploaded         |
      | older autosave                 | kept local only  |
      | backup Resume save             | kept local only  |
      | orders journal                 | kept local only  |

  @SAVE-056
  Scenario: Deleting a campaign deletes it from the cloud
    Given the player is signed in
    When the player deletes the campaign as "Portugal"
    Then the server tombstones every save of that campaign
    And other devices remove it on their next sync

  @SAVE-057
  Scenario Outline: Signing in
    Given the game runs on "<platform>"
    When the player signs in with email and password
    Then the server returns a short-lived access token and a long-lived device token
    And the device token is kept in <secure storage>
    And the device appears in the account's device list

    Examples:
      | platform | secure storage   |
      | iOS      | Keychain         |
      | Android  | Keystore         |
      | desktop  | safeStorage      |

  @SAVE-057
  Scenario: Signing out another device
    Given the player is signed in on a "Steam Deck" and a "Pixel 8"
    When the player signs out the "Steam Deck" from the "Pixel 8"
    Then the "Steam Deck" no longer syncs

  @SAVE-058
  Scenario Outline: Password reset and account deletion
    Given the player has an account with saves on the server
    When the player <action>
    Then <result>

    Examples:
      | action                     | result                                    |
      | asks for a password reset  | a reset email is sent                     |
      | deletes the account        | the account and every save are deleted    |

  @SAVE-059
  Scenario Outline: Sign-in options at launch
    Given the game is at launch
    When the sign-in options are listed on "<platform>"
    Then "<options>" are offered

    Examples:
      | platform | options                                          |
      | Steam    | Steam, email and password                        |
      | iOS      | Sign in with Apple, Steam, email and password    |
      | Android  | Google, Steam, email and password                |
      | web      | Steam, Google, Sign in with Apple, email and password |

  @SAVE-059
  Scenario: Google on iOS needs Apple too
    Given a later version offers Google sign-in
    When the sign-in options are listed on "iOS"
    Then Sign in with Apple is offered as well

  @SAVE-060
  Scenario Outline: Where sign-in sits
    Given the player is not signed in
    When the player opens <place>
    Then <offer> is shown
    And nothing blocks play until the player signs in

    Examples:
      | place                 | offer                      |
      | Settings              | the Cloud saves row        |
      | the Load screen       | the prompt "Sign in to sync" |

  @SAVE-061
  Scenario: How the server stores a save
    Given the player is signed in with the account "acc1"
    When the save "s1" of the campaign "c1" uploads
    Then a Save row holds account, campaign, save id, kind, name, saved at, device, platform, game version, format version, turn, date, nation, ironman, size and deleted at
    And the bytes go to object storage at "acc1/c1/s1.phsave"
    And the bytes are not in the database

  @SAVE-062 @placeholder
  Scenario: Tombstones and purge
    # config key: cloud.server.tombstone_purge_days
    Given the save "s1" is on the server
    When the player removes it
    Then the server marks it deleted with a tombstone
    And other devices learn of it through the changes list
    And its bytes are purged after 30 days

  @SAVE-063
  Scenario Outline: Server calls
    Given the player is signed in
    When the game calls "<call>"
    Then the server <does>

    Examples:
      | call                                        | does                                                     |
      | GET /api/saves?since=<cursor>               | returns headers and tombstones changed since the cursor and a new cursor |
      | PUT /api/saves/{saveId}                     | stores one save, headers and bytes                       |
      | GET /api/saves/{saveId}                     | returns the bytes                                        |
      | DELETE /api/saves/{saveId}                  | leaves a tombstone                                       |
      | DELETE /api/campaigns/{campaignId}          | tombstones every save of the campaign                    |
      | POST /api/campaigns/{campaignId}/ironman-head | claims the ironman line                                |

  @SAVE-063
  Scenario Outline: Uploads are write-once
    Given the server holds the save "s1"
    When the game uploads "s1" again with <bytes>
    Then the upload is <result>

    Examples:
      | bytes             | result   |
      | the same bytes    | accepted |
      | different bytes   | rejected |

  @SAVE-064
  Scenario Outline: When the game fetches changes
    Given the player is signed in
    When <moment>
    Then the game fetches changes since its last cursor
    And headers arrive first so the Load screen fills at once
    And bytes download only when a save is opened, or in the background for the newest Resume save

    Examples:
      | moment                          |
      | the game launches               |
      | the player returns to the app   |

  @SAVE-065
  Scenario: The upload queue
    Given the player is signed in
    And the device is offline
    When 3 saves are written and the app is restarted
    Then the 3 uploads are still queued
    When the device comes online
    Then they upload oldest first
    And failed uploads retry with growing waits

  @SAVE-066
  Scenario: Backgrounding uploads nothing extra
    Given the player is signed in with uploads queued
    When the app is backgrounded
    Then only the orders journal is written
    And the queue continues next time

  @SAVE-067
  Scenario Outline: Wi-Fi only
    Given the player is signed in
    And "Sync on Wi-Fi only" is <wifi only>
    And the device is on a metered connection
    When a save is written
    Then the upload <result>

    Examples:
      | wifi only | result                         |
      | off       | starts                         |
      | on        | waits for Wi-Fi                |

  @SAVE-068 @placeholder
  Scenario Outline: Server checks
    # config key: cloud.server.max_save_mb
    Given the player is signed in
    When the game uploads a save with <problem>
    Then the server rejects it

    Examples:
      | problem                                   |
      | a size over 2 MB                          |
      | a wrong magic                             |
      | a chunk whose CRC does not match          |
      | a header that differs from its database row |

  @SAVE-069 @placeholder
  Scenario: Quota
    # config keys: cloud.server.quota_saves, cloud.server.quota_mb (OQ-SAVE-5)
    Given the account holds 300 saves
    When the game uploads another save
    Then the game asks the player to delete old saves
    And the server drops no save on its own

  @SAVE-070
  Scenario: Rate limits
    Given one device sends uploads faster than the rate limit
    When the next upload arrives
    Then the server refuses it for that device

  @SAVE-071
  Scenario: Later, the server can check a save with the engine
    Given a save is to count toward a leaderboard
    When the server loads it with the engine
    Then it recomputes worldHash and compares it with the header

  @SAVE-072
  Scenario: Purchases stay in each store
    Given the full game was bought on Steam only
    And the campaign as "Portugal" synced from Steam to an Android phone without the unlock
    When the player opens it on the phone
    Then the phone asks for the unlock
    And the server does not unlock "Portugal" on the phone

  @SAVE-104
  Scenario: Personal settings ride the account sync
    Then the account's synced files include "settings-personal.json"
