@context-game-shell
Feature: The turn on screen
  As a player
  I want ending a turn to be one tap, with every battle of mine and every event shown to me
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

  @SHELL-073 @open-question
  Scenario: A save is taken just before the turn runs
    # OQ-SHELL-5: the saves design calls this the Resume save plus orders journal
    Given no event is unanswered
    When the player taps End turn
    Then a save of the world before the turn is taken before the turn runs

  @SHELL-074 @open-question
  Scenario: The turn stops for each player battle
    # OQ-SHELL-2: warfare 7.15 still describes a report with a Watch button
    Given the army "Armée de Dunois" of "France" will meet an English army at "Troyes" this month
    When the turn reaches the battle at "Troyes"
    Then the turn stops
    And the map flies to "Troyes"
    And the screen "battle" opens on the before-the-battle card
    And the card shows both armies, their commanders, the ground and the standing orders of "Armée de Dunois"
    And the standing orders can be changed for this one battle

  @SHELL-075
  Scenario Outline: Fight or skip, then the result card
    Given the turn is stopped on the before-the-battle card at "Troyes"
    When the player presses "<button>"
    Then <playback>
    And the battle ends on its result card showing who won, men lost and the one-line reason
    And the result card offers "Carry on"

    Examples:
      | button         | playback                                  |
      | Fight          | the battle plays bell by bell             |
      | Skip to result | the battle jumps to its end               |

  @SHELL-075
  Scenario: Skip to result at any moment
    Given the battle at "Troyes" is playing bell by bell
    When the player presses "Skip to result"
    Then the result card is shown

  @SHELL-076
  Scenario: Carry on to the next battle in month order
    Given this month "France" fights at "Troyes" on the 5th and at "Reims" on the 20th
    And the turn is stopped on the result card at "Troyes"
    When the player presses "Carry on"
    Then the turn resumes
    And the turn stops at the before-the-battle card at "Reims"

  @SHELL-077
  Scenario Outline: Other realms' battles never stop the turn
    Given "Castile" and "Portugal" fight a battle this month
    And the battle <matters> to the player
    When the turn runs
    Then the turn does not stop for that battle
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
    Given the turn is stopped on the before-the-battle card at "Troyes"
    When the app <what happens>
    Then <result>

    Examples:
      | what happens                                  | result                                                                   |
      | goes to the background and comes back         | the before-the-battle card at "Troyes" is shown again                    |
      | is killed and started again                   | the pre-turn save replays the month to "Troyes" with the same result     |

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
