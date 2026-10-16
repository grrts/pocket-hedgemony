@context-game-shell
Feature: Load and loading screens
  As a player
  I want to pick a save and see real progress with a useful tip
  So that loading is short and never wasted

  @SHELL-038 @open-question
  Scenario: Load lists saves newest first
    # OQ-SHELL-4: the saves design groups the list by campaign first
    Given saves exist from May 1503, January 1500 (autosave) and March 1490 (ironman)
    When the player opens the screen "load"
    Then the saves are listed newest first
    And each save shows its banner, realm, in-game date, real date saved, and an autosave or ironman mark
    When the player taps the save from May 1503
    Then its card shows "Load" and "Delete"

  @SHELL-039
  Scenario: Load from the main menu needs no confirmation
    Given the screen "load" was opened from the main menu
    When the player picks "Load" on a save
    Then the screen "loading" opens with no confirmation

  @SHELL-040 @SHELL-005
  Scenario Outline: Load from the game menu asks only with unsaved turns
    Given the campaign as "France" is at May 1503
    And the campaign <unsaved> unsaved turns
    And the screen "load" was opened from the game menu
    When the player picks "Load" on a save
    Then <result>

    Examples:
      | unsaved  | result                                                                  |
      | has      | the question "Leave May 1503 unsaved? · Save first · Leave · Cancel" is shown |
      | has no   | the screen "loading" opens with no question                             |

  @SHELL-041
  Scenario: Tips fit the realm and date
    Given the tips table holds tips tagged by era, region and whether they are for new players
    When the screen "loading" opens for the realm "France" in Spring 1444
    Then a tip fitting the realm "France" and the date Spring 1444 is shown
    When the player presses right
    Then another tip is shown

  @SHELL-042
  Scenario: The bar shows real steps
    Given a save is being loaded
    When the screen "loading" opens
    Then the bar names the real steps such as "Reading the save", "Drawing the borders" and "Waking the courts"
    And the bar does not follow a fake timer

  @SHELL-043 @placeholder
  Scenario Outline: Loading goes straight to the map, but lets a tip be read
    # config key: shell.tip_min_seconds
    Given the current tip appeared <shown> seconds ago
    When loading finishes
    Then the map opens after <wait> more seconds without the player tapping

    Examples:
      | shown | wait |
      | 0.5   | 1.5  |
      | 2.0   | 0    |
      | 4.0   | 0    |

  @SHELL-044
  Scenario: Loading music
    Given a save is being loaded
    When the screen "loading" opens
    Then the track "load_resume" plays
