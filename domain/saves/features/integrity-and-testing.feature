@context-saves
Feature: Integrity, bug reports and release tests
  As the game
  I want to catch damaged and edited saves, and replay any bug from a report
  So that saves stay trustworthy without fighting determined cheaters

  @SAVE-092
  Scenario Outline: Damage and edits are caught
    Given a save with <problem>
    When it is loaded
    Then the problem is detected by <check>

    Examples:
      | problem                               | check                    |
      | one flipped byte in a chunk           | the chunk's CRC-32       |
      | a province owner edited and CRCs fixed | the recomputed worldHash |

  @SAVE-093
  Scenario: Saves are not encrypted
    Given a save is written
    When its bytes are read
    Then the header is readable JSON and the chunks are plain deflate

  @SAVE-094 @SAVE-095
  Scenario Outline: A save that fails the hash check
    Given a save whose worldHash does not match its world
    And the save <ironman>
    When the player opens it
    Then <result>

    Examples:
      | ironman        | result                                                              |
      | is not ironman | a warning is shown, then it opens and is marked as modified in its header |
      | is ironman     | it does not open                                                    |

  @SAVE-095 @open-question
  Scenario: Achievements can read the flags
    # OQ-SAVE-1: achievements asks for ironman_unbroken, cheat_marked and switched_country
    Given a save is written
    When the achievements context reads its header
    Then it finds the ironman flag and the modified mark

  @SAVE-096
  Scenario: A file cut short
    Given a save file cut short at any byte
    When the player opens it
    Then it is rejected cleanly
    And the previous save is offered

  @SAVE-097
  Scenario: Send a report
    Given the player chooses to send a report
    When the report is sent
    Then it carries the Resume save and the orders journal
    And a developer can replay the exact turn that went wrong
    And nothing was sent without the player's choice

  @SAVE-098
  Scenario Outline: Release tests
    Given the save code is to be released
    When the test "<test>" runs
    Then it passes

    Examples:
      | test                                                                                       |
      | every save in test/saves loads, migrates and plays a turn                                  |
      | save, load and save again gives byte-identical chunks and the same worldHash               |
      | a file cut short at any byte is rejected cleanly and the previous save offered             |
      | the app killed during a write leaves the old save intact on desktop and both phones        |
      | backgrounding, killing and relaunching on a real iPhone and Android phone resumes with the queued orders |
      | two devices with cloud on, played offline and reconnected, show both lines of play         |
      | two devices with one ironman campaign, played offline and reconnected, show the one prompt |

  @SAVE-099 @open-question
  Scenario Outline: The engine worker reads and writes the bytes
    # OQ-SAVE-10: today's protocol has only newGame without options and endTurn
    Given the engine worker runs
    When the client sends the request "<request>"
    Then the worker <reply>
    And the platform storage layer only stores and lists the bytes

    Examples:
      | request | reply                                                         |
      | newGame | starts a game with the seed, player nation and game options   |
      | endTurn | runs the turn and also returns the serialised Resume save     |
      | save    | returns the file bytes for the kind and optional name         |
      | load    | migrates, validates and returns a snapshot                    |
