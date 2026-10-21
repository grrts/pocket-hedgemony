@context-saves
Feature: Buying the full game on each store
  As a player who bought the full game on one store
  I want the game to know it on that store, and the server to see refunds
  So that the full game unlocks where I paid for it, offline too, and my saves are always kept

  @SAVE-170
  Scenario: A purchase unlocks only its own store
    Given the full game was bought on Steam only
    And the account is signed in on Steam and on an Android phone
    Then the full game is unlocked on Steam
    And the full game is locked on the Android phone
    And the account's saves are on both

  @SAVE-171
  Scenario: One purchase, one account
    Given the App Store purchase "2000000123456789" is held by the account "A"
    When the account "B" sends the same purchase
    Then the server refuses with "This purchase is on another Pocket Hegemony account."
    And the account "A" keeps the purchase

  @SAVE-172
  Scenario: The game asks the server about its store
    Given the account holds an active Google Play purchase
    When the game asks for the entitlement on "google"
    Then the answer says the full game is unlocked, with status "active"
    And the answer carries the tag the Play purchase should carry for this account

  @SAVE-173 @placeholder
  Scenario Outline: Steam ownership is checked at most daily
    Given the account signed in with the Steam account "76561198000000001"
    And Steam says that account <owns> the full game
    And the last check was <hours> hours ago
    When the game asks for the entitlement on "steam"
    Then the server <calls> Steam
    And the answer's status is "<status>"

    Examples:
      | owns           | hours | calls         | status   |
      | owns           | 30    | calls         | active   |
      | owns           | 2     | does not call | active   |
      | no longer owns | 30    | calls         | refunded |

  @SAVE-174
  Scenario: An App Store transaction is checked against Apple's root
    When the game sends a StoreKit 2 signed transaction for "full_game" whose chain leads to the Apple Root CA - G3
    Then the server records an active App Store purchase
    But a transaction whose chain leads to another root is refused
    And a transaction for another bundle id is refused

  @SAVE-174
  Scenario: A revoked App Store transaction
    When the game sends a signed transaction with a revocation date
    Then the server records the App Store purchase as revoked
    And the full game is locked on the App Store

  @SAVE-175
  Scenario Outline: A Google Play token is read with the Play Developer API
    When the game sends a Play purchase token whose purchase state is <state>
    Then the server answers "<status>"
    And the purchase is <acknowledged>

    Examples:
      | state     | status  | acknowledged                      |
      | purchased | active  | acknowledged when it was not yet  |
      | pending   | pending | not acknowledged                  |

  @SAVE-176
  Scenario Outline: App Store notifications
    Given the account holds an active App Store purchase
    When the App Store sends a signed "<type>" notification for it
    Then the purchase's status is "<status>"

    Examples:
      | type             | status   |
      | REFUND           | refunded |
      | REVOKE           | revoked  |
      | REFUND_REVERSED  | active   |

  @SAVE-176
  Scenario: A notification that is not signed by Apple
    When a notification arrives whose signature does not lead to Apple's root
    Then the server refuses it and changes nothing

  @SAVE-177
  Scenario: A voided Google Play purchase
    Given the account holds an active Google Play purchase
    When Pub/Sub pushes a voided purchase notification for its token with the push token
    Then the purchase's status is "refunded"
    And the push is acknowledged

  @SAVE-177
  Scenario: A push without the push token
    When Pub/Sub pushes a notification without the push token
    Then the server refuses it and changes nothing

  @SAVE-178
  Scenario: A store whose settings are not set
    Given the server has no Google Play settings
    When the game asks for the entitlement on "google"
    Then the server answers 503 with "Google Play purchases are not available on this server."
    And Steam purchases, sign-in and saves keep working

  @SAVE-179
  Scenario Outline: The game decides from its store and the server
    Given the game runs on the store "<store>"
    And the store says the full game is <local>
    And the server's answer is "<server>"
    Then the full game is <result> on this device

    Examples:
      | store  | local     | server    | result   |
      | apple  | owned     | active    | unlocked |
      | apple  | not owned | active    | unlocked |
      | apple  | owned     | refunded  | locked   |
      | google | owned     | revoked   | locked   |
      | google | owned     | none      | unlocked |
      | google | not owned | none      | locked   |
      | google | owned     | no answer | unlocked |
      | apple  | not owned | no answer | locked   |
      | google | not owned | pending   | locked   |
      | steam  | owned     | refunded  | unlocked |
      | steam  | owned     | no answer | unlocked |

  @SAVE-179
  Scenario: The store's proof goes up first
    Given the game runs on the store "apple"
    And the store says the full game is owned
    And the server's answer is "none"
    Then the game sends the store's proof before it decides

  @SAVE-180
  Scenario Outline: Without a cloud server or a store bridge nothing changes
    Given the build <server> a cloud server and its shell <bridge> a store bridge
    Then the full game is unlocked on this device
    And there is no unlock state

    Examples:
      | server       | bridge       |
      | names no     | gives        |
      | names        | gives no     |
      | names no     | gives no     |

  @SAVE-181
  Scenario: A locked realm or save opens the Unlock card
    Given the game runs on the store "google"
    And the full game is not bought on this store
    When the player starts a new campaign as "Portugal"
    Then the Unlock card opens with "Portugal" still chosen
    When the player opens a save of the nation "Portugal"
    Then the Unlock card opens with "Portugal is part of the full game. Unlock it to continue this campaign."
    And the save is kept
    But a new campaign as "France" starts at once
