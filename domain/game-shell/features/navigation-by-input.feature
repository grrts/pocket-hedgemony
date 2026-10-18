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
      | Android  | main_menu | the app is left              |
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

  @SHELL-121
  Scenario Outline: Three controller action sets
    Given a controller is in use
    When the screen "<screen>" is on top
    Then the action set "<set>" is active

    Examples:
      | screen         | set    |
      | main_menu      | Menu   |
      | settings       | Menu   |
      | card           | Menu   |
      | realm_book     | Menu   |
      | event          | Menu   |
      | game_menu      | Menu   |
      | battle         | Battle |
      | map            | Map    |

  @SHELL-121
  Scenario: The Menu set
    Given a controller is in use
    When the screen "realm_book" is on top
    Then the action set offers "move focus, select, back, bumpers switch tabs or step through the card stack, Show on map"

  @SHELL-121
  Scenario: The Text layer
    Given a controller is in use
    And the game runs on "Steam Deck"
    And the screen "load" is on top
    When a text field opens
    Then the action set "Menu" is active with the Text layer on top

  @SHELL-122 @placeholder
  Scenario Outline: The map with a controller
    # config key: shell.controller_end_turn_hold
    Given a controller is in use
    And the screen "map" is shown
    Then the left stick moves a free cursor that snaps gently to provinces, armies and castles
    And the right stick pans
    And the triggers zoom
    And d-pad right opens the next waiting item
    When the player holds Menu for <seconds> seconds
    Then <result>

    Examples:
      | seconds | result                    |
      | 0.5     | the turn is ended         |
      | 0.2     | the game menu opens       |

  @SHELL-122 @SHELL-128 @placeholder
  Scenario Outline: End turn on a keyboard
    # config key: shell.controller_end_turn_hold
    Given a mouse and keyboard are in use
    And the screen "map" is shown
    When the player holds Enter for <seconds> seconds
    Then <result>

    Examples:
      | seconds | result                          |
      | 0.5     | the turn is ended               |
      | 0.1     | the focused button is selected  |

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

  @SHELL-134
  Scenario Outline: The battle viewer with a controller
    Given a controller is in use
    And the battle viewer shows the <card> card <how>
    When the player presses <button>
    Then <result>

    Examples:
      | card    | how                  | button     | result                              |
      | running | in a running turn    | A          | the battle does "pause or play"     |
      | result  | in a running turn    | A          | the battle does "Carry on"          |
      | running | in a running turn    | B          | the battle does "back to the map"   |
      | running | in a replay          | B          | the battle does "leave"             |
      | running | in a running turn    | X          | the battle does "Retreat"           |
      | running | in a running turn    | Y          | the battle does "the commander's line" |
      | running | in a running turn    | LB and RB  | the battle does "switch battle"     |
      | running | in a running turn    | Menu       | the battle does "nothing"           |
      | running | in a replay          | Menu       | the battle does "leave"             |

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

  @SHELL-121
  Scenario Outline: Three controller action sets
    Given a controller is in use
    When the screen "<screen>" is on top
    Then the action set "<set>" is active

    Examples:
      | screen         | set    |
      | main_menu      | Menu   |
      | settings       | Menu   |
      | card           | Menu   |
      | realm_book     | Menu   |
      | event          | Menu   |
      | game_menu      | Menu   |
      | battle         | Battle |
      | map            | Map    |

  @SHELL-121
  Scenario: The Menu set
    Given a controller is in use
    When the screen "realm_book" is on top
    Then the action set offers "move focus, select, back, bumpers switch tabs or step through the card stack, Show on map"

  @SHELL-121
  Scenario: The Text layer
    Given a controller is in use
    And the game runs on "Steam Deck"
    And the screen "load" is on top
    When a text field opens
    Then the action set "Menu" is active with the Text layer on top

  @SHELL-122 @placeholder
  Scenario Outline: The map with a controller
    # config key: shell.controller_end_turn_hold
    Given a controller is in use
    And the screen "map" is shown
    Then the left stick moves a free cursor that snaps gently to provinces, armies and castles
    And the right stick pans
    And the triggers zoom
    And d-pad right opens the next waiting item
    When the player holds Menu for <seconds> seconds
    Then <result>

    Examples:
      | seconds | result                    |
      | 0.5     | the turn is ended         |
      | 0.2     | the game menu opens       |

  @SHELL-122 @SHELL-128 @placeholder
  Scenario Outline: End turn on a keyboard
    # config key: shell.controller_end_turn_hold
    Given a mouse and keyboard are in use
    And the screen "map" is shown
    When the player holds Enter for <seconds> seconds
    Then <result>

    Examples:
      | seconds | result                          |
      | 0.5     | the turn is ended               |
      | 0.1     | the focused button is selected  |

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

  @SHELL-119
  Scenario: A march order by touch needs no confirm
    Given a campaign is loaded
    When the player taps the army "Armée de Dunois" at "Paris" and then the province "Troyes"
    Then the army is ordered to march to "Troyes" with no confirm step

  @SHELL-143 @feedback-27
  Scenario: Space ends the turn
    Given a mouse and keyboard are in use
    And the screen "map" is shown
    When the player presses Space
    Then the turn ends as if End turn were tapped
    But while a text field has focus, Space types a space and the turn does not end
