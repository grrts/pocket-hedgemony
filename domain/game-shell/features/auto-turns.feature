@context-game-shell
Feature: Auto turns
  As a player of a single-player campaign
  I want the weeks to play one after another until I stop them or something needs me
  So that quiet stretches of a campaign go by without pressing End turn every week

  @SHELL-159
  Scenario: Auto turns play week after week
    Given a single-player campaign with Auto turns off
    When the player taps Auto
    Then Auto turns are on
    And a week starts playing
    When the week has played and its saves are written
    Then the next week starts by itself

  @SHELL-159
  Scenario: Auto turns are off after loading
    Given a single-player campaign with Auto turns on
    When the campaign is loaded again
    Then Auto turns are off

  @SHELL-159
  Scenario: No Auto turns with more than one player
    Given a campaign with 2 players
    Then Auto turns are not offered

  @SHELL-160
  Scenario Outline: Pausing finishes the current week
    Given a single-player campaign with Auto turns on
    And a week is playing
    When the player taps <button>
    Then the week plays on
    And End turn says "Stops at the end of this week"
    When the week has played and its saves are written
    Then Auto turns are off
    And no new week starts
    And orders can be given

    Examples:
      | button   |
      | End turn |
      | Auto     |

  @SHELL-160
  Scenario: Tapping Auto again keeps it on
    Given a single-player campaign with Auto turns on
    And a week is playing
    When the player taps End turn
    And the player taps Auto
    Then Auto turns are on
    When the week has played and its saves are written
    Then the next week starts by itself

  @SHELL-160
  Scenario: End turn pauses as before with Auto turns off
    Given a single-player campaign with Auto turns off
    And a week is playing
    When the player taps End turn
    Then the week is paused

  @SHELL-161
  Scenario Outline: Auto turns stop by themselves
    Given a single-player campaign with Auto turns on
    And a week is playing
    When <what> during the week
    Then the week plays on to its end unless it already waits for the player
    When the week has played and its saves are written
    Then Auto turns are off
    And no new week starts

    Examples:
      | what                                         |
      | an event comes for the player                |
      | a battle of the player's begins              |
      | a siege of the player's begins               |
      | a war is declared on the player              |
      | a call to arms comes for the player          |
      | a peace offer comes for the player           |
      | an envoy waits for the player's answer       |
      | beaten rebels wait for the player's verdict  |
      | the player's scholars have nothing to study  |
      | one of the player's armies ends its march    |

  @SHELL-161
  Scenario: A blocked End turn stops Auto turns
    Given a single-player campaign with Auto turns on
    And land just taken waits for a decision
    When the week has played and its saves are written
    Then Auto turns are off
    And no new week starts
