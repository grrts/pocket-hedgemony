@context-saves
Feature: Signing in with Apple, Google and Steam on phones and the web
  As a player on an iPhone, an Android phone or the web
  I want to sign in with one tap through Apple, Google or Steam
  So that my phone opens the same account and the same saves as my Steam Deck, with no password

  @SAVE-149
  Scenario: The first Sign in with Apple makes the account
    Given no account holds the Apple id "001234.abcd"
    When the player signs in with an Apple identity token for "001234.abcd" and its nonce as "Bertrand"
    Then the server makes an account named "Bertrand" that holds that Apple id
    And signing in with Apple again opens the same account

  @SAVE-150
  Scenario: The first Google sign-in makes the account with the name Google gives
    Given no account holds the Google id "1098765"
    When the player signs in with a Google ID token for "1098765" named "Bertrand" and its nonce
    Then the server makes an account named "Bertrand" that holds that Google id

  @SAVE-149 @SAVE-150 @placeholder
  Scenario Outline: A token the server does not accept
    When the player signs in with <store> token that <fault>
    Then the server refuses with "<message>"
    And no account is made

    Examples:
      | store       | fault                                        | message                           |
      | an Apple    | is signed by a key not in Apple's key set    | Apple did not accept the sign-in.  |
      | an Apple    | was issued by someone other than Apple       | Apple did not accept the sign-in.  |
      | an Apple    | is for another app                           | Apple did not accept the sign-in.  |
      | an Apple    | expired 2 minutes ago                        | Apple did not accept the sign-in.  |
      | an Apple    | carries another nonce                        | Apple did not accept the sign-in.  |
      | an Apple    | is signed with "none"                        | Apple did not accept the sign-in.  |
      | a Google    | is for another app                           | Google did not accept the sign-in. |
      | a Google    | expired 2 minutes ago                        | Google did not accept the sign-in. |

  @SAVE-149 @placeholder
  Scenario: Clocks a little apart
    When the player signs in with an Apple identity token that expired 30 seconds ago
    Then the server accepts it

  @SAVE-151
  Scenario: Steam in the browser sheet
    Given no account holds the Steam account "76561198000000003"
    When the player taps Sign in with Steam on a phone
    And Steam signs the player in as "76561198000000003" and sends the browser back to the server
    And Steam confirms the answer in a check_authentication round trip
    Then the browser goes back to "pockethegemony://auth/steam" with a one-time code
    And exchanging the code makes an account named "Player" that holds that Steam account

  @SAVE-151 @placeholder
  Scenario: A code works once and for 5 minutes
    Given a one-time code from Steam in the browser
    When the game exchanges it twice
    Then the second exchange is refused
    And a code exchanged 6 minutes after it was made is refused as well

  @SAVE-151
  Scenario Outline: An answer from Steam the server does not accept
    Given the player is signing in with Steam in the browser
    When Steam's answer <fault>
    Then the browser goes back to the game with "steamError" and no code

    Examples:
      | fault                                            |
      | is not confirmed by Steam                        |
      | names another return address                     |
      | claims an id that is not a Steam community id    |
      | carries a response nonce used before             |
      | carries a response nonce older than 5 minutes    |

  @SAVE-152
  Scenario: Only the game's own return addresses
    When the game asks for Steam's sign-in address to come back to "https://evil.example/"
    Then the server refuses with "return_not_allowed"

  @SAVE-153 @SAVE-112
  Scenario Outline: Adding a store sign-in to the account
    Given the player is signed in with the Steam account "76561198000000001"
    When the player adds <sign-in>
    Then the account's sign-ins are Steam and <store>
    And signing in with <store> opens the same account

    Examples:
      | sign-in                              | store  |
      | an Apple identity token and its nonce | Apple  |
      | a Google ID token and its nonce       | Google |

  @SAVE-153
  Scenario: A store sign-in that belongs to another account
    Given an account that holds the Apple id "001234.abcd"
    And the player is signed in to another account
    When the player adds an Apple identity token for "001234.abcd"
    Then the server refuses with "linked_to_another_account"

  @SAVE-154 @SAVE-118
  Scenario Outline: A store sign-in the server is not set up for
    Given the server has no <setting>
    When the player signs in with <store>
    Then the server answers "<message>"
    And email sign-in still works

    Examples:
      | setting           | store              | message                          |
      | Apple client ids  | Apple              | Sign in with Apple is not available. |
      | Google client ids | Google             | Google sign-in is not available. |
      | return addresses  | Steam in the browser | Steam sign-in is not available. |

  @SAVE-154
  Scenario: Apple's keys cannot be fetched
    Given Apple's key set cannot be reached
    When the player signs in with Apple
    Then the server answers "Sign in with Apple is not available."

  @SAVE-155 @SAVE-059
  Scenario Outline: The card's sign-in buttons on each platform
    Given the player is signed out on <platform>
    When the player opens Settings, Account and cloud saves
    Then the card shows the buttons "<buttons>" above "Or use email instead:"

    Examples:
      | platform         | buttons                                                      |
      | an iPhone        | Sign in with Apple, Sign in with Steam                       |
      | an Android phone | Sign in with Google, Sign in with Steam                      |
      | the web          | Sign in with Steam, Sign in with Google, Sign in with Apple  |

  @SAVE-155 @SAVE-059
  Scenario: On iOS no store sign-in without Sign in with Apple
    Given the iPhone build cannot start Sign in with Apple
    When the player opens Settings, Account and cloud saves
    Then the card shows no store sign-in button, only the email sign-in

  @SAVE-155
  Scenario: A cancelled sign-in
    Given the player is signed out on an Android phone
    When the player taps Sign in with Google and closes Google's sheet
    Then the card says why under the buttons
    And the player is still signed out

  @SAVE-156
  Scenario: The Sign-ins row with Apple
    Given the player signed in with Apple on an iPhone and has no email
    When the player opens Settings, Account and cloud saves
    Then under the display name the card says "Signed in with Apple"
    And the Sign-ins row lists Apple
    And the card offers "Add Sign in with Steam"

  @SAVE-157
  Scenario: The card on a phone in landscape
    Given the player is signed out on a phone held in landscape
    When the player opens Settings, Account and cloud saves
    Then the store sign-in buttons fill the column and are 48 points high
    And the card stays one scrolling column inside the safe areas with nothing that needs hover
