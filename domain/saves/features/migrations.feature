@context-saves
Feature: Keeping saves working across updates
  As a player
  I want my old saves to open after every update
  So that a long campaign survives patches

  @SAVE-045
  Scenario: Format version goes up with any layout change
    Given format version 7 is released
    When a build changes the layout of the chunk "armies"
    Then the build's formatVersion is 8

  @SAVE-005 @SAVE-046
  Scenario: Migrations run in order
    Given a save with formatVersion 6
    And the build has formatVersion 8
    When the save is loaded
    Then the migration 6 → 7 runs, then 7 → 8
    And each migration is a pure function of the previous version's chunks
    And the result is validated

  @SAVE-047
  Scenario: Mapping step when the map changed
    Given a save whose mapHash differs from the build's
    And the map's rename table maps the province "old-1" to "new-1" and "new-2" with shares
    When the save is loaded
    Then the format migrations run first
    And provinces and nations are matched by id through the ids chunk
    And the province "old-1" is mapped onto "new-1" and "new-2" by those shares
    And fields new in this build get their default value from the rules

  @SAVE-047 @SAVE-048
  Scenario Outline: Dropped nations
    Given a save whose rulesHash differs from the build's
    And the build drops the nation "<nation>"
    And the nation table <entry>
    When the save is loaded
    Then <result>

    Examples:
      | nation  | entry                             | result                                                              |
      | nation-a | maps "nation-a" to "nation-b"    | the provinces of "nation-a" go to "nation-b"                        |
      | nation-c | has no entry for "nation-c"      | the provinces of "nation-c" become unowned and a warning is logged, not an error |

  @SAVE-049
  Scenario: A save from a newer version
    Given a save with formatVersion 9
    And the build has formatVersion 8
    When the player tries to open it
    Then it is not opened
    And the message "This save is from a newer version of Pocket Hegemony. Update the game to open it." is shown

  @SAVE-005 @SAVE-050
  Scenario: Test saves gate every release
    Given every earlier release added an early-game and a late-game save to "packages/engine/test/saves/"
    When the test run for a new release runs
    Then every save from every earlier release is loaded and plays one turn
    And the release cannot ship if any of them fails
    And the new release adds at least 2 saves of its own

  @SAVE-050
  Scenario: The changelog names format changes
    Given a release changes the format
    When its changelog is written
    Then it says the release changes the format

  @SAVE-051
  Scenario: Balance patch mid-campaign
    Given a save from before a balance patch
    When it is loaded after the patch
    Then the turn already saved is unchanged
    And the new rules apply from the next turn on with the saved Rng state
    And the save is not corrupted
