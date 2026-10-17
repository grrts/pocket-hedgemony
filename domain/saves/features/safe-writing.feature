@context-saves
Feature: Writing a save safely
  As a player
  I want a crash or a full disk never to damage a save I already have
  So that there is always a good save to go back to

  @SAVE-032
  Scenario Outline: The write steps
    Given the game runs on "<platform>"
    When a new autosave replaces the oldest one
    Then the save is serialised and compressed in the worker
    And it is written to a temporary file in the same folder
    And it is <commit>
    And only then the oldest autosave is removed

    Examples:
      | platform | commit                                       |
      | Android  | flushed to disk and renamed to its final name |
      | desktop  | flushed to disk and renamed to its final name |
      | web      | committed in a single IndexedDB transaction  |

  @SAVE-032
  Scenario: Killed during a write
    Given the Resume save of turn 820 exists
    When the app is killed while the Resume save of turn 821 is being written
    And the player starts the game again
    Then the Resume save of turn 820 is intact

  @SAVE-033
  Scenario: The newest two Resume saves are kept
    Given Resume saves exist for turns 819 and 820
    When the Resume save of turn 821 is written
    Then the Resume saves of turns 820 and 821 are kept
    And the Resume save of turn 819 is removed

  @SAVE-033 @SAVE-096
  Scenario: A damaged Resume save falls back
    Given the Resume save of December 1511 is good
    And the newer Resume save is damaged
    When the player continues
    Then the Resume save of December 1511 is opened
    And the message "This save is damaged. The previous save from Dec 1511 was opened instead." is shown

  @SAVE-003
  Scenario: Files are never changed
    Given a save file exists
    When any later save is written
    Then the existing file's bytes are unchanged
    And the new save has a new file name

  @SAVE-034 @placeholder
  Scenario Outline: Budgets
    # config keys: budgets.*; targets for the performance design to confirm on a low-end Android phone
    Given a low-end Android phone
    When <operation> is measured
    Then it is under <target>

    Examples:
      | operation                                      | target  |
      | the save file size at the 1444 start           | 400 KB  |
      | the save file size late in the game (1900s)    | 2 MB    |
      | writing a save in the worker                   | 300 ms  |
      | writing the orders journal                     | 20 ms   |
      | reading one save's header                      | 5 ms    |
      | loading a save including migrations            | 1.5 s   |
