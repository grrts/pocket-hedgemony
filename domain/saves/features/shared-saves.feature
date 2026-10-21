@context-saves
Feature: Sharing saves with the community
  As a player whose campaign is worth showing, or stuck
  I want to post a save to the community and play the saves others post
  So that players try each other's playthroughs and help fix a campaign that went wrong

  @SAVE-124
  Scenario: Sharing exposes one save and nothing else
    Given the player is signed in with 4 saves in the cloud
    When the player shares the save "Castile, May 1492"
    Then the community sees that one save
    And none of the player's other saves are public

  @SAVE-124
  Scenario: A shared save outlives its cloud save
    Given the player shared the save "Castile, May 1492"
    When the player deletes that save on the Load card
    Then the shared save can still be played

  @SAVE-124
  Scenario: A hidden topic takes its save away
    Given the player shared the save "Castile, May 1492"
    When a moderator hides its topic
    Then the share code answers "There is no shared save with this code."

  @SAVE-125
  Scenario Outline: What the save is for picks the board
    Given the player is signed in
    When the player shares a save as "<purpose>"
    Then a topic opens on the board "<board>" as the player
    And the server returns a share code and the link "/s/<code>"

    Examples:
      | purpose            | board                         |
      | Show my campaign   | Strategy and campaign stories |
      | Help me with this  | Saves to try                  |
      | Something broke    | Bug reports                   |

  @SAVE-125
  Scenario: The server checks the file and drops the device name
    Given the player is signed in on a "Steam Deck"
    When the player shares a save made on the "Steam Deck"
    Then the server checks its size, magic and CRCs as for any upload
    And the shared copy's header names no device

  @SAVE-125
  Scenario: A damaged file is not shared
    When the player shares a file with one flipped byte in a chunk
    Then the server refuses it
    And no topic is opened

  @SAVE-126
  Scenario: Sharing needs the account
    Given the player is signed out
    When the player opens the Share sheet
    Then the sheet says sharing posts as the player
    And it offers Sign in

  @SAVE-126 @placeholder
  Scenario: Shared saves have their own limit
    Given the player has 300 saves in the cloud
    When the player shares a save
    Then the share is accepted
    And the cloud quota is unchanged
    But an account with 50 shared saves cannot share another

  @SAVE-127
  Scenario: The card and the file
    Given the player "Leroy" shared the save "Castile, May 1492"
    When another player asks for the share code
    Then the card names "Leroy", Castile, May 1492, the week, the play time and the game version
    And fetching the file counts one play

  @SAVE-128
  Scenario: Opening a shared save starts a campaign of one's own
    Given a shared save "Castile, May 1492" by "Leroy" with the code "K7QXM2PA"
    When the player opens it
    Then a new campaign with its own campaign id joins the Manual saves
    And its header says it came from "K7QXM2PA" by "Leroy"
    And every later save of that campaign says so too

  @SAVE-128
  Scenario: The usual checks apply to a shared save
    Given a shared save of the nation "Portugal"
    And the full game is not unlocked
    When the player opens it
    Then the unlock screen shows as for any save

  @SAVE-129
  Scenario: A shared ironman save opens as a normal campaign
    Given a shared save of an ironman campaign
    When the player opens it
    Then the copy is not ironman
    And its flag ironman_unbroken is off

  @SAVE-130
  Scenario: Sharing back into the original topic
    Given the player opened the shared save with the code "K7QXM2PA" and played on
    When the player shares that campaign as "Reply in the original topic"
    Then the save goes up as a reply in the topic of "K7QXM2PA"
    And the reply has its own save card

  @SAVE-130
  Scenario: A locked topic takes no reply
    Given the topic of the shared save "K7QXM2PA" is locked
    When the player shares a copy of it as "Reply in the original topic"
    Then the server refuses with "This topic is locked: nobody can reply to it."

  @SAVE-131
  Scenario: Removing a shared save
    Given the player shared the save "Castile, May 1492"
    When the player removes it
    Then the share code answers "There is no shared save with this code."
    And the topic stays, its card saying the save was removed

  @SAVE-132
  Scenario: Where sharing is found
    Given the build names a cloud server
    Then an open Load line holds Load, Share and Delete
    And the game menu holds Share this campaign
    And the Load card ends with Open a shared save

  @SAVE-132
  Scenario: Without a server there is no sharing
    Given the build names no cloud server
    Then neither Share nor Open a shared save shows

  @SAVE-133
  Scenario: The Share sheet
    Given the player is signed in
    When the player taps Share on the save "Castile, May 1492"
    Then the sheet holds the title "Castile, May 1492", a note, the three choices and Post to the community
    When the player posts it
    Then the sheet says "Shared. Your topic is on the community."
    And it offers Copy link, Share link and Open the topic

  @SAVE-134
  Scenario: The save card on the topic
    Given the player "Leroy" shared an ironman save
    When anyone opens its topic
    Then the save card shows above the post with the map crop, title, date, week, play time and game version
    And it says "Was ironman: opens as a normal campaign"
    And it holds the share code, Play this save and Download

  @SAVE-134
  Scenario: A copy says where it came from
    Given the player opened a shared save by "Leroy"
    Then its Load line says "From Leroy's campaign"

  @SAVE-135
  Scenario: The overview of what the player shared
    Given the player shared 2 saves, one played 3 times
    Then the Shared saves row lists both with "Played 3 times" on the one
    And each has Remove, which asks first

  @SAVE-136
  Scenario Outline: The Share sheet on a phone held sideways
    Given a phone in landscape in the "<layout>" layout
    When the Share sheet opens
    Then it is one scrolling column inside the safe areas
    And the three choices are at least 64 points high and every other button 44
    And nothing needs hover

    Examples:
      | layout |
      | Wide   |
      | Tall   |

  @SAVE-137
  Scenario: A share link opens the app
    Given the phone build registers app links
    When the player taps "https://<domain>/s/K7QXM2PA"
    Then the game opens on that shared save

  @SAVE-138
  Scenario: Sharing an exported file from the website
    Given a player who never signed in from the game exported a save
    When they start a topic on the website with the file attached
    Then the topic shows its save card

  @SAVE-139
  Scenario: A save that needs Workshop mods
    Given a shared save whose header lists 2 Workshop mods
    Then its card says "Needs 2 Workshop mods (Steam only)" with links to them
