@context-game-shell
Feature: Other in-campaign screens
  As a player
  I want the battle viewer, siege view, peace table, map mode picker and confirmations to open and close predictably
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
  Scenario: Map mode picker and confirmations
    When the player opens the map mode picker from the tool column
    Then it is a small pop-over that returns to the map
    When the player starts a destructive action
    Then a small confirmation modal is shown
    When the player cancels it
    Then the screen below is shown unchanged

  @SHELL-141 @feedback-10
  Scenario: An AI peace offer waits for an answer
    Given an AI realm at war with the player offers peace
    When the turn ends
    Then the offer shows in the turn report and in Waiting for you
    And the realm's Diplomacy tab is marked until the offer is answered or put off

  @SHELL-147 @feedback-72
  Scenario: The News log keeps past weeks
    Given the player's realm fought a battle last week
    When the player ends the turn and the week plays out
    Then the News does not open by itself
    And the News button counts the new news items about the player's realm
    When the player taps the News button
    Then this week's news is listed first under its day
    And last week's battle is still listed under its day

  @SHELL-147 @feedback-72
  Scenario Outline: A battle or siege begins
    Given the turn is playing
    When <what> begins in a province
    Then an alert over the map says so with Go there
    When the player taps Go there
    Then the map is centred on that province and the province is selected

    Examples:
      | what                                         |
      | a battle between the player's army and an enemy |
      | an enemy's siege of the player's castle         |
      | the player's siege of an enemy castle           |

  @SHELL-148 @feedback-73
  Scenario: The week waits at a battle
    Given the turn is playing
    When a battle between the player's army and an enemy begins
    Then the week pauses and an alert over the map says so with Watch
    When the player taps Watch
    Then the map is centred on the battle and the week plays on more slowly
    And a strip over the map shows both realms' men left and the round of the battle
    When the battle ends
    Then the strip says who won
