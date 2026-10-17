@context-settings
Feature: Controls
  As a player with touch, mouse and keyboard, or a controller
  I want controls that fit my hand and my device
  So that giving orders is quick and comfortable

  @SET-075 @open-question
  Scenario Outline: Main hand
    # OQ-SET-16: where the game menu button goes is not said
    Given the game runs with touch
    When the player sets "Main hand" to "<hand>"
    Then the action bar and the End turn button are on the <side> side

    Examples:
      | hand  | side  |
      | Right | right |
      | Left  | left  |

  @SET-076 @open-question
  Scenario Outline: Long-press time
    # OQ-SET-7: screen flow says long press only explains
    Given "Long-press time" is "<value>"
    When the player holds a finger on a stat for <held> seconds
    Then the tooltip <result>

    Examples:
      | value  | held | result        |
      | Short  | 0.3  | shows         |
      | Medium | 0.3  | does not show |
      | Medium | 0.5  | shows         |
      | Long   | 0.8  | shows         |

  @SET-077
  Scenario Outline: Touch defaults
    Given the player has never changed controls on a phone
    When Controls → Touch is opened
    Then "<setting>" is "<default>"

    Examples:
      | setting            | default |
      | Double-tap to zoom | On      |
      | Pan and zoom speed | Medium  |

  @SET-078 @open-question
  Scenario Outline: Right-click gives orders
    # OQ-SET-8: screen flow's touch flow has no confirm step
    Given the game runs on desktop
    And "Right-click gives orders" is "<value>"
    When the player <action>
    Then the army "Armée de Dunois" is ordered to march to "Troyes"

    Examples:
      | value | action                                                                         |
      | On    | left-clicks the army "Armée de Dunois" and right-clicks the province "Troyes"  |
      | Off   | clicks the army "Armée de Dunois", clicks the province "Troyes" and confirms   |
      | On    | clicks the army "Armée de Dunois", clicks the province "Troyes" and confirms   |

  @SET-079
  Scenario Outline: Mouse and keyboard defaults
    Given the game runs on desktop in the profile "Desktop"
    When Controls → Mouse and keyboard is opened
    Then "<setting>" is "<default>" with the options "<options>"

    Examples:
      | setting                   | default            | options                                  |
      | Wheel zoom                | Toward the cursor  | Toward the cursor, Toward the centre     |
      | Edge scrolling            | On in fullscreen   | On, Off, On in fullscreen                |
      | Pan speed (keys and edge) | Medium             | Slow, Medium, Fast                       |

  @SET-080
  Scenario: Rebinding with a conflict
    Given "End turn" is bound to "Enter"
    And "Turn report" is bound to "R"
    When the player binds "R" to "End turn" as its second key
    Then the question "Also bound to Turn report, swap?" is shown
    And each action holds at most 2 keys

  @SET-081 @open-question
  Scenario Outline: Default keys
    # OQ-SET-4: the zoom keys Q and E disagree between the table and the yaml
    Given the key bindings are the defaults
    When the player presses "<key>" on the map
    Then "<action>" happens

    Examples:
      | key    | action                    |
      | W      | pan up                    |
      | Left   | pan left                  |
      | +      | zoom in                   |
      | -      | zoom out                  |
      | Esc    | the pause menu opens      |
      | 1      | the lens "realms"         |
      | 2      | the lens "terrain"        |
      | 3      | the lens "people"         |
      | 4      | the lens "wealth"         |
      | 5      | the lens "walls"          |
      | 6      | the lens "food"           |
      | Tab    | the next lens             |
      | .      | the next army             |
      | ,      | the previous army         |
      | N      | the next notification     |
      | R      | the turn report           |
      | Home   | jump to capital           |
      | L      | the ledger                |

  @SET-082 @SET-104
  Scenario Outline: The End turn key
    Given "Hold actions" is "<hold>"
    When the player <press> "Enter"
    Then the turn <result>

    Examples:
      | hold | press                    | result      |
      | On   | holds for 0.5 s          | ends        |
      | On   | taps once                | does not end |
      | Off  | presses twice            | ends        |
      | Off  | presses once             | does not end |

  @SET-083
  Scenario Outline: Button prompts
    Given "Button prompts" is "<value>"
    And the player last used <controller>
    When prompts are shown
    Then they are <glyphs>

    Examples:
      | value       | controller                     | glyphs                               |
      | Auto        | a PlayStation controller       | PlayStation glyphs                   |
      | Xbox        | a PlayStation controller       | Xbox glyphs                          |
      | Auto        | a Steam Controller on Steam    | Steam Input glyphs of the player's own bindings |

  @SET-084
  Scenario Outline: Confirm button
    Given <layout> is detected
    When the defaults are read
    Then "Confirm button" is "<confirm>"

    Examples:
      | layout                | confirm |
      | an Xbox layout        | Bottom  |
      | a Nintendo layout     | Right   |

  @SET-084
  Scenario: Swapping confirm and back
    Given "Confirm button" is "Right"
    When the player presses B on a menu
    Then the focused entry is confirmed

  @SET-085 @SET-086 @SET-088 @SET-090
  Scenario Outline: Controller defaults
    Given the profile is "Desktop" with a controller
    When Controls → Controller is opened
    Then "<setting>" is "<default>" with the options "<options>"

    Examples:
      | setting                    | default | options                 |
      | Cursor speed               | Medium  | Slow, Medium, Fast      |
      | Cursor acceleration        | On      | On, Off                 |
      | Snap to provinces          | Light   | Off, Light, Strong      |
      | Vibration                  | Light   | Off, Light, Full        |
      | Hold to open the action menu | Hold  | Hold, Tap               |

  @SET-086
  Scenario: Snap to provinces
    Given "Snap to provinces" is "Light"
    When the stick cursor crosses a small province in the Holy Roman Empire
    Then the cursor slows over the province's centre and its armies

  @SET-087 @SET-089 @SET-091
  Scenario Outline: Rows Steam Input owns
    Given the game runs <where>
    When Controls → Controller is opened
    Then "Stick deadzone" is <deadzone>
    And "Gyro cursor" is <gyro>
    And controller rebinding is <rebind>

    Examples:
      | where                       | deadzone                      | gyro                                   | rebind                                  |
      | on Steam                    | not shown                     | not shown                              | "Open Steam controller settings"        |
      | on Android                  | shown, 5–30 %, default 12 %   | shown where the platform reports motion | the in-game rebind list                |
      | in a non-Steam desktop build | shown, 5–30 %, default 12 %  | shown where the platform reports motion | the in-game rebind list                |

  @SET-089
  Scenario: Gyro cursor default
    Given a PlayStation controller off Steam that reports motion
    When Controls → Controller is opened
    Then "Gyro cursor" is "Off" with the options "Off, While touching the right trackpad / stick, Always"

  @SET-092 @open-question
  Scenario Outline: Default controller layout
    # OQ-SET-3: screen flow holds End turn for half a second
    Given the controller layout is the default
    And the player is on the "<mode>"
    When the player uses "<input>"
    Then "<result>" happens

    Examples:
      | mode        | input              | result                                  |
      | map         | left stick         | the map cursor moves                    |
      | map         | right stick        | the camera pans                         |
      | map         | LT                 | zoom out                                |
      | map         | RT                 | zoom in                                 |
      | map         | A                  | select                                  |
      | map         | B                  | deselect, back                          |
      | map         | X                  | the action menu on the selection        |
      | map         | Y                  | the info card for what's under the cursor |
      | map         | LB                 | the previous army                       |
      | map         | RB                 | the next army                           |
      | map         | d-pad up           | cycle map lenses                        |
      | map         | d-pad right        | the next notification                   |
      | map         | View               | the turn report                         |
      | map         | View held 1 s      | End turn                                |
      | map         | Menu               | the pause menu                          |
      | map         | left stick click   | jump to capital                         |
      | map         | right stick click  | recentre on the selection               |
      | menu        | left stick         | move focus                              |
      | menu        | right stick        | scroll the panel                        |
      | menu        | LT                 | the previous page                       |
      | menu        | A                  | confirm                                 |
      | menu        | B                  | back                                    |
      | menu        | X                  | reset row                               |
      | menu        | Y                  | the long description                    |
      | menu        | RB                 | the next tab                            |
      | menu        | d-pad right        | step a value                            |
      | menu        | Menu               | close the panel                         |
      | battle view | right stick        | pan                                     |
      | battle view | LT                 | slower playback                         |
      | battle view | RT                 | faster playback                         |
      | battle view | A                  | pause or play                           |
      | battle view | B                  | skip to result                          |
      | battle view | X                  | replay the last bell                    |
      | battle view | Y                  | the commander's line                    |
      | battle view | Menu               | leave the battle view                   |

  @SET-093
  Scenario Outline: Steam Controller and Deck extras
    Given the game runs on Steam with the official Steam Input configuration on a "Steam Deck"
    When the player uses "<input>"
    Then "<result>" happens

    Examples:
      | input                      | result                                          |
      | the right trackpad         | a mouse-like cursor with momentum               |
      | the left trackpad          | the camera pans                                 |
      | a left trackpad click      | zoom to the province under the cursor           |
      | a back grip                | previous or next notification, or the ledger and the turn report |
      | gyro                       | nothing until turned on as "aim while touching the right trackpad" |

  @SET-094 @open-question
  Scenario: Steam Input action sets
    # OQ-SET-5: screen flow defines six action sets
    Given the game runs on Steam
    When Steam Input loads the game's actions
    Then the action sets are Map, Menu and Battle, plus a Text layer for the on-screen keyboard
    And official configurations exist for the Steam Controller, Steam Deck, Xbox, PlayStation and Nintendo controllers
    And button prompts come from GetGlyphPNGForActionOrigin
