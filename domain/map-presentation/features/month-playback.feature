@context-map-presentation
Feature: Playing the month back on the map
  As a player
  I want to watch the month I just played in a few seconds
  So that I see what happened without reading a list

  @VIEW-035 @placeholder
  Scenario: The month plays at about a second per ten days
    Given the config value "replaySecondsPer10Days" is 1
    When a turn ends
    Then the 30 days of the month play in about 3 seconds
    And a skip button is offered

  @VIEW-036
  Scenario: Playback shows marches, battles and castles that stop armies
    Given an army marched to "Langres" and was stopped by its castle on day 14
    And a battle was fought in "Langres" on day 22
    When the month plays back
    Then the army walks its route
    And "Langres" castle rings red on day 14
    And crossed swords flash on day 22 and playback pauses for half a second

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
