@context-map-presentation
Feature: Playing the turn back on the map
  As a player
  I want to watch the week I just played in a moment
  So that I see what happened without reading a list

  @VIEW-035 @placeholder
  Scenario Outline: The turn's days play at about a second per ten days
    Given the config value "replaySecondsPer10Days" is 1
    When the turn starting on <first> ends
    Then the <days> days of the turn play in about <seconds> seconds
    And a skip button is offered

    Examples:
      | first            | days | seconds |
      | 11 November 1444 | 7    | 0.7     |
      | 26 August 1939   | 6    | 0.6     |

  @VIEW-035 @placeholder
  Scenario: Playback slows to 4-hour steps while a player battle runs
    Given the config value "replaySecondsPer10Days" is 1
    And a player battle ran in "Langres" from day 5 for 2 days of the turn starting 11 November 1444
    When the turn plays back
    Then the 5 whole days play in about 0.5 seconds and the 2 battle days in about 6 seconds
    And no skip button is offered

  @VIEW-071
  Scenario: The battle bar switches between running battles
    Given the player's battles in "Langres" and "Troyes" are running, "Langres" followed
    When the player taps "Troyes" in the battle bar
    Then the battle bar shows both battles with their progress
    And "Troyes" is followed and the camera moves to it

  @VIEW-036
  Scenario: Playback shows marches, battles and castles that stop armies
    Given an army marched to "Langres" and was stopped by its castle on day 3
    And a battle was fought in "Langres" on day 6
    When the turn plays back
    Then the army walks its route
    And "Langres" castle rings red on day 3
    And crossed swords flash on day 6 and playback does not pause

  @VIEW-037
  Scenario: The map stays live while the turn is worked out
    Given End turn has been given
    When the worker is processing the turn
    Then the map can still be panned and zoomed
    And armies march and borders change as results arrive

  @VIEW-038 @placeholder
  Scenario Outline: A long turn shows what is being worked out
    Given a turn takes <seconds> seconds
    When the turn is processed
    Then <shown>

    Examples:
      | seconds | shown                                                         |
      | 0.4     | no strip is shown                                             |
      | 2       | a parchment strip says "The courts of Europe deliberate…"     |

  @VIEW-076 @feedback-7
  Scenario: The date ticks during playback
    When the turn plays back
    Then the top bar's date ticks one day at a time
    And it shows the hour of each 4-hour step while a player battle runs

  @VIEW-077 @feedback-8
  Scenario: Battles show their progress on the map
    Given a battle runs at "Patay"
    When a round is fought
    Then the map shows each side's men and a bar of men and morale left
    And the battle viewer shows the same
