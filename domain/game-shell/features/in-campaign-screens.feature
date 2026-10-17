@context-game-shell
Feature: Other in-campaign screens
  As a player
  I want the battle viewer, siege view, peace table, lens picker and confirmations to open and close predictably
  So that Back always does what I expect

  Background:
    Given a campaign as "France" is loaded

  @SHELL-090
  Scenario Outline: Back in the battle viewer
    Given the screen "battle" was opened <from>
    When the player presses Back
    Then <result>

    Examples:
      | from                                  | result                                         |
      | by a running player battle            | the map is shown and the battle keeps running  |
      | from the turn report as a replay      | the turn report is shown                       |
      | from the tab "Chronicle" as a replay  | the tab "Chronicle" is shown                   |

  @SHELL-091
  Scenario Outline: Siege view
    Given the castle of "Orléans" is besieged
    When the player opens the siege view from <from>
    Then the screen "siege" opens as a full screen
    When the player presses Back
    Then the map is shown at the castle of "Orléans"

    Examples:
      | from                                  |
      | the castle at local zoom              |
      | the castle's card                     |

  @SHELL-092
  Scenario Outline: Peace table
    When the player opens the peace table from <from>
    Then the screen "peace" opens as a modal
    And Back returns to <from>

    Examples:
      | from                                 |
      | the tab "Abroad"                     |
      | the country card of "England"        |

  @SHELL-092
  Scenario: Incoming peace offers must be answered or put off
    Given "England" sends a peace offer to "France"
    When the peace table opens for the offer
    Then the offer cannot be dismissed
    And the player can answer it or put it off one turn

  @SHELL-093
  Scenario: Lens picker and confirmations
    When the player opens the map lens picker from the tool column
    Then it is a small pop-over that returns to the map
    When the player starts a destructive action
    Then a small confirmation modal is shown
    When the player cancels it
    Then the screen below is shown unchanged
