@context-saves
Feature: Combining two accounts and removing a sign-in
  As a player who signed in with Steam on the PC and with Apple on the phone before linking them
  I want to combine the two accounts when I add the second sign-in
  So that every save, shared save and purchase ends up in one account instead of a dead end

  @SAVE-186 @placeholder
  Scenario: A sign-in of another account offers to combine
    Given the account "Leroy" signed in with the Steam account "76561198000000001"
    And the account "Bertrand" signed in with Sign in with Apple and holds 4 cloud saves and 1 shared save
    When the account "Leroy" adds that Sign in with Apple
    Then the server refuses with "linked_to_another_account"
    And the refusal offers to combine with "Bertrand", 4 saves and 1 shared save
    And the offer lasts 10 minutes
    # sign_in.combine_minutes is provisional

  @SAVE-186
  Scenario: An email of another account offers to combine only with its password
    Given the account "Bertrand" signs in with the email "bertrand@example.org"
    And the account "Leroy" has no email
    When the account "Leroy" adds the email "bertrand@example.org" with a wrong password
    Then the server refuses with "linked_to_another_account" and offers nothing
    When the account "Leroy" adds the email "bertrand@example.org" with its password
    Then the refusal offers to combine with "Bertrand"

  @SAVE-187
  Scenario: Combining moves everything to the account the player is in
    Given the account "Bertrand" holds sign-ins, devices, cloud saves, shared saves, an App Store purchase and community posts
    When the account "Leroy" combines with the account "Bertrand"
    Then the account "Leroy" holds all of them, with the saves' bytes under its own keys
    And the account "Leroy" keeps its id and its display name
    And the account "Bertrand" no longer exists
    And a sign-in with Sign in with Apple opens the account "Leroy"

  @SAVE-187 @placeholder
  Scenario Outline: An old or altered offer combines nothing
    Given the account "Leroy" was offered to combine with the account "Bertrand"
    When <what>
    Then the server refuses with "<code>"
    And both accounts are as they were

    Examples:
      | what                                              | code               |
      | 11 minutes pass and the offer is sent             | combine_expired    |
      | the offer is sent altered                         | combine_expired    |
      | the offer is sent from a device of another account | combine_expired    |
      | the offer is sent again after combining           | nothing_to_combine |

  @SAVE-188
  Scenario: Two sign-ins of one store are not combined
    Given the account "Leroy" holds the Steam account "76561198000000001"
    And the account "Bertrand" holds the Steam account "76561198000000002" and Sign in with Apple
    When the account "Leroy" adds that Sign in with Apple
    Then the offer says both accounts have a Steam sign-in
    And combining is refused with "both_have_steam"
    And both accounts are as they were

  @SAVE-189
  Scenario: The same campaign on both accounts keeps every save
    Given the campaign "camp-1" has the saves "a" and "shared" on the account "Leroy"
    And the campaign "camp-1" has the saves "b" and "shared" on the account "Bertrand"
    And the save "shared" is removed on the account "Leroy" only
    When the two accounts are combined into "Leroy"
    Then the account "Leroy" holds the saves "a", "b" and "shared" of the campaign "camp-1"
    And the save "shared" is held once and not removed

  @SAVE-189
  Scenario: Two ironman heads for one campaign
    Given the ironman campaign "iron" has its head at the save "i2" saved in March 1512 on the account "Leroy"
    And the ironman campaign "iron" has its head at the save "j2" saved in June 1512 on the account "Bertrand"
    When the two accounts are combined into "Leroy"
    Then the ironman head of "iron" is the save "j2"
    And an ironman upload that follows "i2" is told to load the newer game first

  @SAVE-190
  Scenario Outline: Two purchases on one store
    Given the account "Leroy" holds a <leroy> App Store purchase
    And the account "Bertrand" holds a <bertrand> App Store purchase
    When the two accounts are combined into "Leroy"
    Then the account holds one App Store purchase, the <kept> one
    And the full game is <state> on the App Store

    Examples:
      | leroy    | bertrand | kept              | state    |
      | refunded | active   | active            | unlocked |
      | active   | revoked  | active            | unlocked |
      | active   | active   | staying account's | unlocked |
      | revoked  | refunded | refunded          | locked   |

  @SAVE-191 @placeholder
  Scenario: Combining over the quota keeps every save
    Given the account "Leroy" holds 200 cloud saves and the account "Bertrand" 150
    When the account "Leroy" adds a sign-in of the account "Bertrand"
    Then the offer says the storage will be full
    When the two accounts are combined into "Leroy"
    Then the account "Leroy" holds all 350 saves
    And the next upload is refused with "quota_full"

  @SAVE-192
  Scenario: The other account's devices learn of it on their next sync
    Given the account "Bertrand" is signed in on the iPhone, which holds the cloud lines of "Bertrand"
    And the account "Leroy" is signed in on the Steam Deck
    When the two accounts are combined into "Leroy" from the Steam Deck
    Then the iPhone stays signed in, now in the account "Leroy"
    And its next sync starts the account's changes over and shows the saves of both
    And the Steam Deck's next sync brings the saves that moved

  @SAVE-193
  Scenario: Removing a sign-in, never the last
    Given the account holds the Steam account "76561198000000001" and the email "leroy@example.org"
    When the player removes the email sign-in
    Then the account holds the Steam sign-in only, and the device stays signed in
    And removing the Steam sign-in is refused with "last_sign_in"

  @SAVE-194 @SAVE-195 @SAVE-196 @SAVE-197
  Scenario: The card asks once what combining does
    Given the player is signed in as "Leroy" on the Account and cloud saves card
    When an Add brings a Sign in with Apple of the account "Bertrand" with 4 saves
    Then the card says "This Sign in with Apple has its own Pocket Hegemony account, "Bertrand", with 4 saves."
    And it says "Everything moves to this account, "Leroy": saves, shared saves, purchases, sign-ins and devices. All saves are kept. "Bertrand" is then closed."
    And it offers "Combine accounts" and "Keep apart"
    When the player taps "Combine accounts"
    Then the card says "Accounts combined. Everything from "Bertrand" is now in this account."
    And each sign-in on the Sign-ins row has "Remove" while there are two or more
