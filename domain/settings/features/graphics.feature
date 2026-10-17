@context-settings
Feature: Graphics settings
  As a player on a phone, a Deck or a TV
  I want to trade looks against battery and heat
  So that the game runs well on my device

  @SET-034
  Scenario: Device profile row
    Given the game was detected as "Phone"
    When the player opens Graphics
    Then "Device profile" offers Phone, Tablet, Desktop, Steam Deck and Big screen
    And it shows "Phone"

  @SET-035
  Scenario Outline: Display mode only on desktop
    Given the game runs on "<platform>"
    When the player opens Graphics
    Then "Display mode" is <shown>

    Examples:
      | platform | shown                                     |
      | desktop  | shown with Windowed and Fullscreen        |
      | Android  | not shown                                 |
      | web      | not shown                                 |

  @SET-035
  Scenario: Fullscreen is borderless at the display's resolution
    Given the game runs on desktop
    When the player sets "Display mode" to "Fullscreen" and keeps it
    Then the window is borderless at the display's own resolution
    And no resolution list is offered

  @SET-036
  Scenario Outline: Interface scale
    Given the profile is "Desktop"
    When the player sets "Interface scale" to "<scale>"
    Then panels, cards, icons and text all scale to <scale>

    Examples:
      | scale |
      | 75    |
      | 88    |
      | 100   |
      | 112   |
      | 125   |
      | 150   |
      | 175   |
      | 200   |

  @SET-037
  Scenario Outline: Pixel scaling
    Given the interface scale is 112 %
    When the player sets "Pixel scaling" to "<mode>"
    Then <result>

    Examples:
      | mode   | result                                                                    |
      | Crisp  | interface art snaps to whole pixel multiples, possibly leaving a few pixels of margin |
      | Smooth | the art fills the space exactly and its edges may blur slightly           |

  @SET-038
  Scenario Outline: Sharpness
    Given the device pixel ratio is <ratio>
    When "Sharpness" is "<sharpness>" and the map redraws
    Then the map draws with <pixels> screen pixels per CSS pixel
    And the pixel art stays sharp

    Examples:
      | ratio | sharpness | pixels |
      | 3.5   | Native    | 3      |
      | 2.5   | Native    | 2.5    |
      | 3.5   | Balanced  | 2      |
      | 3.5   | Battery   | 1      |

  @SET-039
  Scenario Outline: Frame rate cap and still maps
    Given "Frame rate cap" is "<cap>"
    When nothing on the map moves
    Then the map does not redraw at all

    Examples:
      | cap          |
      | 30           |
      | 60           |
      | 120          |
      | Display rate |

  @SET-040
  Scenario: Battery saver On
    Given "Battery saver" is "Off"
    When the player sets "Battery saver" to "On"
    Then "Frame rate cap" is 30 and shows "Set by Battery saver"
    And "Sharpness" is "Battery"
    And "Animations" is "Reduced"
    And the map redraws only on change
    And the AI turn's work-step budget is the same as with Battery saver off

  @SET-040
  Scenario Outline: Battery saver Auto
    Given "Battery saver" is "Auto"
    When <device report>
    Then Battery saver is <state>

    Examples:
      | device report                                   | state |
      | iOS turns on Low Power Mode                     | on    |
      | Android turns on Battery Saver                  | on    |
      | a Steam Deck runs on battery under 20 %         | on    |
      | a Steam Deck runs on battery at 45 %            | off   |
      | a Steam Deck runs on its charger                | off   |

  @SET-041
  Scenario Outline: Map detail
    Given a campaign is loaded
    When "Map detail" is "<detail>" and the map redraws
    Then <shows>

    Examples:
      | detail | shows                                                         |
      | Low    | no 8 × 8 close-in tiles (it stays at 4 × 4), no surf and no forest blending |
      | Medium | 8 × 8 tiles and still water                                   |
      | High   | everything                                                    |

  @SET-042
  Scenario Outline: Animations
    Given a campaign is loaded
    When "Animations" is "<level>" and a battle result shows
    Then <result>

    Examples:
      | level   | result                                                          |
      | Full    | water, marching columns, flags, smoke and battle playback all move |
      | Reduced | motion is reduced                                               |
      | Off     | battle results show as still frames                             |

  @SET-043
  Scenario: Keep screen awake on mobile
    Given the game runs on Android and "Keep screen awake during the AI turn" is "On"
    When a long AI turn computes
    Then the phone does not dim

  @SET-044
  Scenario: Screen margins and calibration
    Given the game runs on Steam on a TV that crops the picture
    When the player opens the calibration screen
    Then four corner marks are shown
    When the player pulls them in with the stick to 4 %
    Then "Screen margins" is 4 %

  @SET-044
  Scenario Outline: Screen margins range
    Given the game runs on desktop
    When the player sets "Screen margins" to <value>
    Then the setting <result>

    Examples:
      | value | result      |
      | 0     | is accepted |
      | 10    | is accepted |
      | 11    | is not offered |

  @SET-045
  Scenario Outline: Performance line
    Given a campaign is loaded
    When "Show performance line" is "<value>"
    Then <shows>

    Examples:
      | value            | shows                                                    |
      | Off              | no diagnostics line                                      |
      | FPS              | the frame rate                                           |
      | Full diagnostics | the diagnostics line with engine mode and round trip     |
