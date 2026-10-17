@context-game-shell
Feature: Layout by window shape
  As a player on a phone, tablet, desktop, Steam Deck or TV
  I want screens laid out for the shape of my window
  So that every device gets a layout that fits

  @SHELL-006 @SHELL-108 @SHELL-109 @SHELL-110 @SHELL-111
  Scenario Outline: Shape follows the window
    Given the window is <window>
    When a campaign is shown
    Then the shape is "<shape>"

    Examples:
      | window                                              | shape      |
      | a phone in landscape with a height under 500 css px  | Short wide |
      | a tablet in portrait                                | Tall       |
      | a desktop window taller than wide                   | Tall       |
      | a tablet in landscape                               | Large      |
      | a desktop window wider than tall                    | Large      |
      | a Steam Deck at 1280 × 800                          | Large      |
      | a TV chosen in Settings                             | Far        |
      | a Steam Machine detected on a TV output             | Far        |

  @SHELL-108 @placeholder
  Scenario: Short wide layout
    # config key: shell.short_wide_max_height
    Given the shape is "Short wide"
    When a campaign is shown
    Then the map comes first
    And cards are side sheets on the left
    And the Realm book's tabs are a left icon rail
    And the top bar is one thin row

  @SHELL-109
  Scenario: Tall layout
    Given the shape is "Tall"
    When a campaign is shown
    Then cards are bottom sheets
    And the Realm book's tabs are a bottom icon row
    And the tool column is on the right edge above the End turn button

  @SHELL-110
  Scenario: Large layout
    Given the shape is "Large"
    When a campaign is shown
    Then side sheets have a fixed width
    And menus are centred with a maximum width
    And nothing stretches edge to edge

  @SHELL-111 @placeholder
  Scenario: Far layout for TVs
    # config keys: shell.far_body_text, shell.far_overscan
    Given the shape is "Far"
    When a campaign is shown
    Then the layout is the Large layout
    And the UI scale is raised so body text is about 1/30 of the screen height
    And focus frames are thicker
    And nothing is drawn in the outer 5 % of the screen

  @SHELL-112
  Scenario Outline: Safe areas stay clear
    Given the shape is "<shape>"
    And the device has <obstacle>
    When the screen "map" is shown
    Then no button is under the <obstacle>

    Examples:
      | shape      | obstacle            |
      | Short wide | a notch             |
      | Short wide | rounded corners     |
      | Tall       | a home indicator    |

  @SHELL-113
  Scenario Outline: Phones play in landscape only
    Given the device is <device>
    When it is held upright on the screen "<screen>"
    Then <result>

    Examples:
      | device              | screen     | result                                           |
      | a phone             | map        | the notice "Turn your phone sideways" is shown   |
      | a phone             | main_menu  | the notice "Turn your phone sideways" is shown   |
      | a tablet            | map        | the Tall layout is used                          |
      | a desktop window    | map        | the Tall layout is used                          |

  @SHELL-114 @placeholder
  Scenario: Tap targets
    # config keys: shell.tap_target_min, shell.tap_target_gap
    Given the interface is at its default scale
    When any screen is shown
    Then every tap target is at least 44 × 44 points
    And neighbouring targets are at least 8 points apart

  @SHELL-115
  Scenario Outline: Buttons that lose something are kept safe
    Given the button "<button>" is shown
    When the button "<button>" is laid out
    Then it is not next to a frequent button
    And it is not at the very edge of the screen

    Examples:
      | button            |
      | End turn          |
      | Delete save       |
      | Exit to main menu |

  @SHELL-116
  Scenario: End turn and game menu at opposite corners
    Given a campaign is loaded
    When the screen "map" is shown
    Then the End turn button and the game menu button are in opposite corners

  @SHELL-133
  Scenario Outline: Left hand mirrors the corners
    Given the setting "Main hand" is "<hand>"
    When the screen "map" is shown
    Then the End turn button is in the <end turn> corner
    And the game menu button is in the <menu> corner
    And the two are in opposite corners

    Examples:
      | hand  | end turn    | menu        |
      | Right | lower right | upper left  |
      | Left  | lower left  | upper right |
