@context-game-shell
Feature: Navigation by input
  As a player with touch, mouse and keyboard, or a controller
  I want Back, selection and focus to work the same way everywhere
  So that every screen is usable with whatever I hold

  @SHELL-002 @SHELL-117
  Scenario Outline: Back on each device pops the top of the stack
    Given the game runs on "<platform>" with "<device>"
    And the province card of "Champagne" is open over the map
    When the player uses "<back input>"
    Then the province card closes

    Examples:
      | platform | device     | back input                    |
      | Android  | touch      | system back gesture           |
      | iOS      | touch      | on-screen Back                |
      | desktop  | keyboard   | Esc                           |
      | desktop  | controller | B (east button)               |
      | desktop  | mouse      | the cross on the card         |
      | desktop  | mouse      | mouse button 4                |

  @SHELL-117
  Scenario Outline: iOS edge swipe only on full screens
    Given the game runs on "iOS"
    And the screen "<screen>" is shown
    When the player swipes from the left edge
    Then <result>

    Examples:
      | screen     | result                       |
      | realm_book | the Realm book closes        |
      | map        | the map pans and nothing closes |

  @SHELL-118
  Scenario Outline: Back at the ends of the stack
    Given the game runs on "<platform>"
    And the screen "<screen>" is shown with nothing open on it
    When the player presses Back
    Then <result>

    Examples:
      | platform | screen    | result                       |
      | Android  | map       | the screen "game_menu" opens |
      | Android  | main_menu | "Tap to start" is shown      |
      | Android  | title     | the app is left              |

  @SHELL-119
  Scenario Outline: Touch on the map
    Given the screen "map" is shown
    When the player <gesture>
    Then <result>

    Examples:
      | gesture                                                   | result                                                      |
      | taps the province "Champagne"                             | "Champagne" is selected and its name tab appears lower left |
      | drags                                                     | the map pans                                                |
      | pinches                                                   | the map zooms                                               |
      | long-presses the province "Champagne"                     | what is under the finger is shown without selecting it      |
      | taps the army "Armée de Dunois" then the province "Troyes" | the army is ordered to march to "Troyes"                    |
      | taps the army "Armée de Dunois" then its own province     | the army halts                                              |

  @SHELL-120 @SHELL-007
  Scenario Outline: Touch on cards, the book and menus
    Given the province card of "Champagne" is open
    When the player <gesture>
    Then <result>

    Examples:
      | gesture                 | result                                                         |
      | taps a button           | the button is pressed                                          |
      | drags                   | the card scrolls                                               |
      | pinches                 | nothing happens                                                |
      | long-presses a stat     | the stat's explanation is shown, the same text as a desktop tooltip |

  @SHELL-007 @SHELL-120
  Scenario: Long press only explains
    Given any action the game offers
    When the player looks for the way to do it
    Then it can be reached by tap or by a controller
    And no action exists only as a long press or only as a hover

  @SHELL-121 @open-question
  Scenario Outline: One controller action set per layer
    # OQ-SHELL-8: settings declares three action sets
    Given a controller is in use
    When the screen "<screen>" is on top
    Then the action set "<set>" is active
    And it offers "<needs>"

    Examples:
      | screen         | set    | needs                                                                 |
      | main_menu      | Shell  | move focus, select, back, switch tabs with the bumpers                |
      | settings       | Shell  | move focus, select, back, switch tabs with the bumpers                |
      | card           | Card   | move focus within the card, select, back, next and previous card in the stack, Show on map |
      | realm_book     | Book   | move focus, select, back, switch tabs with the bumpers, Show on map   |
      | event          | Modal  | move focus between options, select, back where deciding later is allowed |
      | game_menu      | Modal  | move focus between options, select, back where deciding later is allowed |
      | battle         | Battle | fight, skip to result, pause, carry on, back                          |
      | map            | Map    | cursor, pan, zoom, select, context actions, next army or waiting item, Realm book, game menu, End turn |

  @SHELL-122 @placeholder @open-question
  Scenario: The map with a controller
    # OQ-SHELL-7: settings holds End turn for 1 s; config key shell.controller_end_turn_hold
    Given a controller is in use
    And the screen "map" is shown
    Then the left stick moves a free cursor that snaps gently to provinces, armies and castles
    And the right stick pans
    And the triggers zoom
    When the player holds the End turn button for 0.5 seconds
    Then the turn ends
    When the player presses the End turn button briefly
    Then the turn does not end

  @SHELL-123
  Scenario: Focus is always visible
    Given a controller is in use
    When any screen opens
    Then its defined first focus has the gold focus frame
    And moving focus follows reading order

  @SHELL-125
  Scenario Outline: Trackpads act as a mouse
    Given the game runs on a Steam Deck
    And the screen "map" is shown
    When the player uses <control>
    Then the map shows <pointer>

    Examples:
      | control            | pointer             |
      | the right trackpad | the mouse pointer   |
      | the left stick     | the stick cursor    |

  @SHELL-126
  Scenario Outline: Button prompts follow the last device
    Given any screen is shown
    When the player last used "<device>"
    Then the prompts shown are <prompts>

    Examples:
      | device                    | prompts                          |
      | touch                     | none                             |
      | an Xbox controller        | Xbox glyphs                      |
      | a PlayStation controller  | PlayStation glyphs               |
      | a Steam Controller        | Steam glyphs                     |
      | a Switch-style controller | Switch-style glyphs              |
      | a keyboard                | keys                             |

  @SHELL-126
  Scenario: Switching device switches prompts at once
    Given the player last used a keyboard
    When the player presses a button on an Xbox controller
    Then Xbox glyphs are shown at once

  @SHELL-127
  Scenario Outline: Text entry without a keyboard
    Given the game runs on "<platform>"
    When a text field opens
    Then it has a filled-in default that can be confirmed without typing
    And typing uses <keyboard>

    Examples:
      | platform                | keyboard                          |
      | Steam Deck              | Steam's on-screen keyboard        |
      | Steam in Big Picture    | Steam's on-screen keyboard        |
      | Android                 | the system keyboard               |

  @SHELL-128
  Scenario Outline: Mouse and keyboard
    Given a mouse and keyboard are in use
    When the player <input>
    Then <result>

    Examples:
      | input                                     | result                                    |
      | hovers over a stat                        | the stat's explanation is shown           |
      | presses Esc                               | Back is done                              |
      | presses Enter on the focused button       | the button is selected                    |
      | presses Tab                               | focus moves to the next element           |
      | presses the End turn key                  | End turn is pressed                       |
