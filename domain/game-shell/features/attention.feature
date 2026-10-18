@context-game-shell
Feature: Attention screen
  As a player
  I want one list of what is wrong and what waits for me
  So that I am warned without an advisor telling me what to do

  Background:
    Given a campaign as "Hungary" is loaded in winter 1444

  @SHELL-083
  Scenario Outline: Ways to open Attention
    When the player <action>
    Then the screen "attention" opens as a card over the map
    And the map stays in view

    Examples:
      | action                                            |
      | taps the Attention bell                           |
      | taps the badge on End turn                        |
      | presses the controller's next button              |
      | presses "Look" on the End turn question           |

  @SHELL-084 @SHELL-085
  Scenario Outline: Lines fall into two groups
    Given <item> applies to "Hungary"
    When the screen "attention" opens
    Then a line for it is in the group "<group>"

    Examples:
      | item                                              | group            |
      | famine in a province within two months            | Warnings         |
      | pay owed to an army                               | Warnings         |
      | an army hungry                                    | Warnings         |
      | a castle breached                                 | Warnings         |
      | a rising brewing                                  | Warnings         |
      | peace voices passing half against "Hungary"       | Warnings         |
      | a ruler without an heir                           | Warnings         |
      | an event not yet answered                         | Waiting for you  |
      | a peace offer                                     | Waiting for you  |
      | an idle army                                      | Waiting for you  |
      | an idle fleet                                     | Waiting for you  |
      | an empty research slot                            | Waiting for you  |
      | an empty school slot                              | Waiting for you  |
      | unspent levies                                    | Waiting for you  |

  @SHELL-084
  Scenario: Warnings come first, most urgent first
    Given "Hungary" has 2 warnings and 3 waiting items
    When the screen "attention" opens
    Then the group "Warnings" is above the group "Waiting for you"
    And within each group the most urgent line is first

  @SHELL-086
  Scenario: Show jumps and Back returns
    Given the screen "attention" shows the warning "an army hungry" for an army of "Hungary"
    Then the line has an icon, one sentence and a "Show" button
    When the player presses "Show"
    Then the camera moves to the army and its card opens
    When the player presses Back
    Then the screen "attention" is shown

  @SHELL-087
  Scenario Outline: Muting lines
    Given the screen "attention" shows 2 lines of the kind "idle army"
    When the player presses "<button>" on one line
    Then <result>
    And the mutes are kept in the save

    Examples:
      | button                     | result                                                                 |
      | Mute this                  | that line is hidden and the other line of the kind stays               |
      | Don't list this kind again | both lines are hidden and "idle army" is listed at the bottom as muted |

  @SHELL-087 @SHELL-120
  Scenario: A long press on a line shows the same buttons
    Given the screen "attention" shows 2 lines of the kind "idle army"
    When the player long-presses one line
    Then its explanation is shown with the buttons "Mute this" and "Don't list this kind again"
    And the line itself has the same two buttons

  @SHELL-083
  Scenario: The screen is titled Needs attention
    When the screen "attention" opens
    Then its title reads "Needs attention"

  @SHELL-087
  Scenario: Unmuting a kind
    Given the kind "idle army" is muted
    When the player unmutes "idle army" from the bottom of the screen "attention"
    Then lines of the kind "idle army" are shown again

  @SHELL-088
  Scenario: The End turn question names the warnings but never blocks
    Given the setting "Confirm End turn" is "Always"
    And no event is unanswered
    And "Hungary" has 3 open warnings
    When the player taps End turn
    Then the question "3 warnings wait for you · Look · End turn anyway" is shown
    When the player picks "End turn anyway"
    Then the turn starts

  @SHELL-089
  Scenario: Attention says what is wrong, not what to do
    Given the warnings table in the config defines the warning "famine in a province within two months"
    When the warning applies to "Pest"
    Then its line says that famine is coming in "Pest"
    And the line gives no advice on what to do
