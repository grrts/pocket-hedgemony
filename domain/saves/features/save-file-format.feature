@context-saves
Feature: The save file
  As the game
  I want one compact binary format whose header can be read alone
  So that saves are small, list fast and open on every platform

  @SAVE-035
  Scenario: File layout
    Given the campaign as "Castile" is loaded
    When a save is written
    Then the file has the extension ".phsave"
    And it starts with the 4 bytes "PHSV"
    And then a uint16 container version and a uint32 header length
    And then the header as uncompressed UTF-8 JSON
    And then a chunk table with the count and, per chunk, id, version, offset, length and CRC-32
    And then the chunks, each compressed with deflate

  @SAVE-036
  Scenario: The Load list reads headers only
    Given 30 saves exist
    When the Load screen is filled
    Then only each file's header is read
    And no chunk is decompressed

  @SAVE-004 @SAVE-037
  Scenario Outline: Identical bytes on every platform
    Given the same world and orders on "<platform a>" and "<platform b>"
    When each writes a save
    Then the chunks are byte-identical
    And compression used the bundled deflate library, not CompressionStream

    Examples:
      | platform a          | platform b |
      | iOS 15 web view     | Steam Deck |
      | Android             | web        |

  @SAVE-004
  Scenario: A save made on Steam opens on a phone
    Given a save made on Steam
    When it is opened on an Android phone
    Then it loads

  @SAVE-038
  Scenario: Header fields
    Given the campaign as "Castile" in May 1492 at turn 577, not ironman, on normal difficulty with historical events and the end date 1939-08-31
    When a manual save "Castile, May 1492" is written on a "Pixel 8"
    Then the header holds saveId, campaignId, kind "manual", name "Castile, May 1492", savedAt, device "Pixel 8", platform "android"
    And it holds gameVersion, formatVersion, rulesHash, mapHash, turn 577, date 1492-05 and playerNation "castile"
    And it holds ironman false, playSeconds, options with difficulty "normal", events "historical" and endDate "1939-08-31"
    And its tier is nation "castile", needsFullGame true and app "full"
    And its flags read ironman_unbroken false, cheat_marked false, switched_country false and began_as_tutorial false
    And it holds worldHash and a 96 × 64 PNG thumbnail

  @SAVE-039
  Scenario: worldHash is recomputed on load
    Given a save whose header worldHash equals hashWorld of its saved state
    When the save is loaded
    Then hashWorld is computed again on the loaded world
    And it equals the header's worldHash

  @SAVE-040 @SAVE-041
  Scenario Outline: Each system owns a chunk
    Given a save is written
    When the chunk "<chunk>" is read
    Then it holds <contents>
    And it has its own version number

    Examples:
      | chunk     | contents                                                                 |
      | core      | the turn, date, Rng state as four uint32s, game options and the player's nation |
      | ids       | the province, nation and commander id lists                              |
      | provinces | owner, people, wealth and the other changing province fields as typed arrays |
      | nations   | treasury, levies and the other changing nation fields                    |
      | armies    | the live armies only, with routes                                        |
      | events    | events fired, flags set, pending choices and event cooldowns             |
      | history   | the realm timeline the ledger and end-of-campaign screens read           |

  @SAVE-040
  Scenario: A new system adds a chunk without touching others
    Given a build adds the chunk "diplomacy"
    When a save is written
    Then the chunk "diplomacy" is added
    And the versions of the other chunks are unchanged

  @SAVE-042
  Scenario Outline: Build data is never saved
    Given a save is written
    When its chunks are read
    Then no chunk holds <build data>

    Examples:
      | build data       |
      | adjacency        |
      | terrain          |
      | water            |
      | rivers           |
      | province shapes  |

  @SAVE-043
  Scenario: Typed arrays through the ids chunk
    Given a save written by a build whose province list is "A, B, C"
    When a later build with the province list "A, C, B, D" loads it
    Then the values for "B" and "C" land on "B" and "C" through the ids chunk
    And the arrays were stored as raw little-endian bytes

  @SAVE-044
  Scenario Outline: Only a mid-turn Resume save carries orders
    Given the player has queued orders
    When a "<kind>" save is written
    Then the orders chunk is <present>

    Examples:
      | kind     | present     |
      | resume   | present     |
      | autosave | not present |
      | manual   | not present |
