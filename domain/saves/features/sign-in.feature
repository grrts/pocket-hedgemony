@context-saves
Feature: Signing in to the Pocket Hegemony account
  As a player who bought the game on more than one store
  I want to sign in with the store I am on, without typing a password
  So that every device opens the same account and the same saves

  @SAVE-112
  Scenario: One account, several sign-ins
    Given an account that holds the Steam account "76561198000000001"
    When the player adds their email "player@example.org" as a sign-in
    Then signing in with Steam or with that email opens the same account

  @SAVE-112
  Scenario: A sign-in belongs to one account
    Given an account that holds the Steam account "76561198000000001"
    When a second account tries to add the Steam account "76561198000000001"
    Then the server refuses with "already linked to another account"

  @SAVE-113
  Scenario: The first Steam sign-in makes the account
    Given no account holds the Steam account "76561198000000002"
    When the player signs in with a Steam ticket for "76561198000000002" as "Bertrand"
    Then the server makes an account named "Bertrand" that holds that Steam account
    And the device appears in the account's device list

  @SAVE-113
  Scenario: A Steam ticket Steam does not accept
    When the player signs in with a Steam ticket Steam refuses
    Then the server refuses with "Steam did not accept the sign-in"
    And no account is made

  @SAVE-114 @placeholder
  Scenario Outline: Every sign-in returns the same pair
    When the player signs in with <method>
    Then the server returns an access token that lasts 15 minutes and a device token
    And the server keeps only the hashes of both tokens

    Examples:
      | method             |
      | email and password |
      | a Steam ticket     |

  @SAVE-115
  Scenario: Refreshing turns the device token over
    Given a signed-in device with device token "A"
    When the device refreshes its access token with "A"
    Then it gets a new access token and a new device token
    And refreshing with "A" again is refused

  @SAVE-116
  Scenario: Signing out another device ends it at once
    Given the account is signed in on "Steam Deck" and "Pixel 8"
    When the player signs out "Pixel 8" from the Steam Deck
    Then the phone's device token and access token are refused

  @SAVE-117
  Scenario: Too many wrong passwords
    Given 5 wrong passwords for "player@example.org" in the last 15 minutes
    When the player tries again
    Then the server refuses with "Too many tries"

  @SAVE-118
  Scenario: No Steam key on the server
    Given the server has no Steam key
    When the player signs in with a Steam ticket
    Then the server answers "Steam sign-in is not available"
    And email sign-in still works
