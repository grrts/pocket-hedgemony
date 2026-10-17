@context-game-shell
Feature: The turn on screen
  As a player
  I want ending a turn to be one tap, with every battle of mine played out in front of me and every event shown to me
  So that nothing is decided for me and nothing is hidden

  Background:
    Given a campaign as "France" is loaded
    And the screen "map" is shown

  @SHELL-069
  Scenario Outline: End turn is one tap unless Settings asks
    Given no event is unanswered
    And the setting "Confirm End turn" is "<confirm>"
    When the player taps End turn
    Then <result>

    Examples:
      | confirm | result                                     |
      | Off     | the turn starts with no question           |
      | Always  | a confirmation is shown before the turn starts |

  @SHELL-070
  Scenario: Unanswered events block End turn
    Given 2 events are unanswered
    Then the End turn button shows the event scroll icon with the count 2 instead of the hourglass
    When the player taps End turn
    Then the first unanswered event opens
    And the turn does not start
    And no event is answered for the player

  @SHELL-071
  Scenario: Turn in progress keeps the map live but frozen
    Given no event is unanswered
    When the player taps End turn
    Then the screen "turn" is shown over the map
    And the map can be panned and zoomed
    And no order can be given
    And the hourglass on End turn turns
    And armies march along their routes and borders change as the worker's results arrive

  @SHELL-072 @placeholder
  Scenario Outline: A strip for long turns
    # config key: shell.turn_strip_after_seconds
    Given no event is unanswered
    And the turn takes <seconds> seconds
    When the player taps End turn
    Then the parchment strip "The courts of Europe deliberate…" <shown>

    Examples:
      | seconds | shown                        |
      | 0.4     | is not shown                 |
      | 1.5     | is not shown                 |
      | 3.0     | is shown after 1.5 seconds   |

  @SHELL-073
  Scenario: The world before the turn is kept before the turn runs
    Given no event is unanswered
    When the player taps End turn
    Then the orders journal is closed with the turn's orders before the turn runs
    And the Resume save and the orders journal together hold the world before the turn

  @SHELL-074
  Scenario: Time slows to 4-hour steps for a player battle
    Given this month "France" fights at "Troyes" on the 5th
    When the player taps End turn
    Then the battle starts on day 5
    And the map flies to "Troyes"
    And the screen "battle" opens on the running battle
    And time passes in steps of 4 hours, 6 a day, while it runs
    And the battle view offers "Standing orders" and "Retreat"
    And the battle view offers no way to skip to the result

  @SHELL-074 @SHELL-077
  Scenario: A fleet's battle slows time too
    Given this month a fleet of "France" fights at "the Channel" on the 6th
    When the player taps End turn
    Then the battle starts on day 6
    And the screen "battle" opens on the running battle

  @SHELL-075
  Scenario: The player watches the battle to its end
    Given the battle at "Troyes" is running
    When 6 steps of 4 hours pass
    Then the battle ends on its result card showing who won, men lost and the one-line reason
    And the result card offers "Carry on"

  @SHELL-075
  Scenario: Standing orders change at any step
    Given the battle at "Troyes" is running
    And 2 steps of 4 hours have passed
    When the player sets the standing orders for this battle to "hold the line"
    Then the battle at "Troyes" fights on with "hold the line"
    And no other battle's orders change

  @SHELL-075
  Scenario: Retreat at any step
    Given the battle at "Troyes" is running
    And 3 steps of 4 hours have passed
    When the player presses "Retreat"
    Then the battle at "Troyes" ends with a retreat after 12 hours
    And the result card is shown

  @SHELL-136
  Scenario: Several battles at once, with a switcher
    Given this month "France" fights at "Troyes" and at "Reims" on the 5th
    When the player taps End turn
    Then the battle switcher lists "Troyes" and "Reims", each with its progress
    When 2 steps of 4 hours pass
    Then both battles show progress "2 / 6"
    When the player switches to the battle at "Reims"
    Then the map flies to "Reims"
    And the battle view shows "Reims"
    When the player presses "Retreat"
    Then the battle at "Reims" ends with a retreat after 8 hours
    And the battle at "Troyes" is still running

  @SHELL-076
  Scenario: Carry on to the next battle in turn order
    Given this month "France" fights at "Troyes" on the 5th and at "Reims" on the 7th
    And the turn is stopped on the result card at "Troyes"
    When the player presses "Carry on"
    Then the turn resumes in whole days
    And the battle at "Reims" starts on day 7

  @SHELL-077
  Scenario Outline: Other realms' battles never stop the turn
    Given "Castile" and "Portugal" fight a battle this month
    And the battle <matters> to the player
    When the turn runs
    Then time does not slow for that battle
    And the battle appears on the map
    And the battle <in report> in the turn report

    Examples:
      | matters         | in report  |
      | matters         | is listed  |
      | does not matter | is not listed |

  @SHELL-078
  Scenario Outline: Every battle can be watched again
    Given the battle at "Troyes" was fought last turn
    When the player opens it from <place>
    Then the screen "battle" replays it

    Examples:
      | place              |
      | the turn report    |
      | the tab "Chronicle" |

  @SHELL-079
  Scenario Outline: Interrupted at a battle
    Given the battle at "Troyes" is running
    When the app <what happens>
    Then <result>

    Examples:
      | what happens                                  | result                                                                   |
      | goes to the background and comes back         | the running battle at "Troyes" is shown again at the same step           |
      | is killed and started again                   | the Resume save and the orders journal replay the month to "Troyes" with the same result |

  @SHELL-080
  Scenario: Events one at a time in date order
    Given the turn raised events on 3 May, 11 May and 27 May
    When the turn reaches its events
    Then the event of 3 May opens first as a modal card with a picture, text and two or three options
    And focusing or tapping an option shows its effects
    When the player answers it
    Then the event of 11 May opens

  @SHELL-081
  Scenario: Look at the map before answering
    Given an event is open
    When the player presses "Look at the map"
    Then the event shrinks into the badge on End turn
    And the map can be used
    And the event is still unanswered

  @SHELL-082
  Scenario Outline: Turn report
    Given the turn <happened>
    When the turn ends
    Then <result>

    Examples:
      | happened                              | result                                                                                 |
      | had something worth reporting         | the turn report slides in from the edge as a card, each line jumping to its place      |
      | had nothing worth reporting           | no turn report opens and only the date in the top bar changes                          |

  @SHELL-082
  Scenario: The turn report closes on the first map tap
    Given the turn report is open
    When the player taps the map
    Then the turn report closes

  @SHELL-137
  Scenario: A turn is one week
    Given a campaign as "France" is loaded on 11 November 1444
    When the player taps End turn
    And the turn runs to its end
    Then the day loop has played 7 days
    And the top bar shows "18 November 1444"
    When 3 more turns are played
    Then the top bar shows "9 December 1444"
