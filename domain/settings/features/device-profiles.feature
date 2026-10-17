@context-settings
Feature: Device profiles
  As a player on any device
  I want good defaults for my kind of device from the first launch
  So that I rarely need to open Settings at all

  @SET-002 @SET-017
  Scenario Outline: Profile detection on first launch
    Given the game launches for the first time <on>
    When the profile is detected
    Then the profile is "<profile>"

    Examples:
      | on                                                      | profile    |
      | on Capacitor with a short side of 390 CSS px            | Phone      |
      | on Capacitor with a short side of 820 CSS px            | Tablet     |
      | on Steam where IsSteamRunningOnSteamDeck() is true      | Steam Deck |
      | on Steam where IsSteamInBigPictureMode() is true        | Big screen |
      | on a Steam Machine                                      | Big screen |
      | on Electron, not a Deck, Big Picture or Steam Machine   | Desktop    |
      | on the web                                              | Desktop    |

  @SET-018
  Scenario: Changing profile reloads only untouched defaults
    Given the profile is "Desktop"
    And the player changed "Frame rate cap" to 120
    When the player changes "Device profile" to "Steam Deck"
    Then "Interface scale" is 112 %
    And "Display mode" is "Fullscreen"
    And "Frame rate cap" is still 120

  @SET-019
  Scenario: A controller doesn't switch the profile
    Given the profile is "Tablet"
    When a controller is connected
    Then controller prompts and focus outlines are added
    And the profile is still "Tablet"

  @SET-020
  Scenario Outline: Defaults by profile
    Given the profile is "<profile>"
    When the defaults are read
    Then "Interface scale" is "<scale>"
    And "Text size" is "<text>"
    And "Display mode" is "<display>"
    And "Frame rate cap" is "<fps>"
    And "Battery saver" is "<battery>"
    And "Sharpness" is "<sharpness>"
    And "Map detail" is "<detail>"
    And "Touch target size" is "<touch>"
    And "Screen margins" is "<margins>"
    And "Edge scrolling" is "<edge>"
    And "Cursor speed" is "<cursor>"

    Examples:
      | profile    | scale | text   | display    | fps          | battery | sharpness | detail | touch  | margins | edge             | cursor |
      | Phone      | Auto  | Normal | n/a        | 60           | Auto    | Balanced  | Medium | Large  | 0       | n/a              | n/a    |
      | Tablet     | Auto  | Normal | n/a        | 60           | Auto    | Balanced  | High   | Normal | 0       | n/a              | n/a    |
      | Desktop    | 100 % | Normal | Windowed   | Display rate | Off     | Native    | High   | n/a    | 0       | On in fullscreen | Medium |
      | Steam Deck | 112 % | Normal | Fullscreen | 60           | Auto    | Native    | High   | Normal | 0       | Off              | Medium |
      | Big screen | 175 % | Large  | Fullscreen | 60           | Off     | Native    | High   | n/a    | 5 %     | Off              | Slow   |

  @SET-020
  Scenario: The calibration screen is offered once on the Big screen
    Given the profile is "Big screen"
    When the game starts for the first and the second time
    Then the screen margin calibration screen is offered the first time only

  @SET-021
  Scenario: Big screen uses the Far layout
    Given the profile is "Big screen" on a 1080p TV
    When the map is shown
    Then the game shell's Far layout is used
    And body text is about 35 px
    And nothing is drawn in the outer 5 % of the screen

  @SET-022
  Scenario Outline: Auto interface scale
    Given "Interface scale" is "Auto" on a phone whose <screen>
    When the scale is chosen
    Then the scale is the largest step at which a 360 × 640 CSS-px safe layout still fits, here <scale>

    Examples:
      | screen                      | scale  |
      | screen is small             | 100 %  |
      | screen is large             | 125 %  |
