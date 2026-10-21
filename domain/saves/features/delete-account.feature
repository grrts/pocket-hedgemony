@context-saves
Feature: Deleting the account
  As a player who no longer wants a Pocket Hegemony account
  I want to delete it from the game, with everything it holds about me
  So that my saves, shared saves and sign-ins are gone, while the full game I bought stays mine

  @SAVE-198
  Scenario: Deleting the account removes everything that is the player's
    Given the account "Leroy" signed in with Steam and an email, on 2 devices
    And the account holds 12 cloud saves, an ironman head and 2 shared saves
    When the account "Leroy" is deleted
    Then the account, its sign-ins, its devices, its cloud saves and its shared saves are gone
    And the bytes of every cloud save and shared save are removed from storage
    And both devices' tokens are refused
    And the share codes of the 2 shared saves no longer open a save

  @SAVE-198
  Scenario: A failed deletion leaves the account whole
    Given the account "Leroy" holds 12 cloud saves
    When deleting the account fails before it is done
    Then the account still holds its 12 cloud saves with their bytes

  @SAVE-199
  Scenario: The purchase record stays without the account
    Given the account "Leroy" holds the full game on the App Store
    When the account "Leroy" is deleted
    Then the server keeps the App Store purchase record, without an account
    And a refund notification from the App Store still marks it refunded

  @SAVE-200
  Scenario: Community posts stay under "Deleted player"
    Given the account "Leroy" started a topic that "Bertrand" replied to
    And the account "Leroy" reported a post
    When the account "Leroy" is deleted
    Then the topic and both posts stay, the author of Leroy's shown as "Deleted player"
    And the report is gone

  @SAVE-202
  Scenario: A new account restores the full game bought by a deleted one
    Given the account "Leroy" bought the full game on the App Store and was deleted
    When the player makes a new account and taps Restore purchases
    Then the new account holds the full game on the App Store
    And the purchase record is the same one, now with the new account

  @SAVE-203 @SAVE-204
  Scenario: Deleting an account with Sign in with Apple revokes Apple's token
    Given the server has a Sign in with Apple key
    And the account "Leroy" signed in with Apple, and the server keeps Apple's refresh token
    When the account "Leroy" is deleted
    Then the server revokes the refresh token with Apple
    And if Apple cannot be reached, the account is deleted all the same

  @SAVE-205 @SAVE-207
  Scenario: The card asks once, naming what goes
    Given the player is signed in as "Leroy" with 12 cloud saves and 2 shared saves
    When the player taps Delete account at the bottom of the Account and cloud saves card
    Then the card asks "Delete the account "Leroy"? Its 12 cloud saves and 2 shared saves are deleted, and every device is signed out."
    And it says the saves on this device and the purchases stay
    And it offers Delete account and Keep

  @SAVE-206
  Scenario: After deleting, the device is signed out and keeps its own saves
    Given the player confirmed Delete account
    When the server has deleted the account
    Then the card shows the signed-out card with "The account is deleted. The saves on this device stay."
    And the Load card lists only the saves on this device

  @SAVE-206
  Scenario: Deleting needs a connection
    Given the player is offline
    When the player taps Delete account
    Then the question says "Connect to delete the account."

  @SAVE-208
  Scenario: The question on a phone in landscape
    Given a phone held in landscape
    When the card asks whether to delete the account
    Then the question sits in the card's scrolling column inside the safe areas
    And Delete account is full width and 48 points high, Keep at least 44, and nothing needs typing or hover
