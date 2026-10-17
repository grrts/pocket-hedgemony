@context-settings
Feature: Platform notes
  As a player on a Steam Deck, a TV, iOS or Android
  I want the defaults and system behaviour my platform expects
  So that the game passes the platform's checks and feels native

  @SET-116
  Scenario: Steam Deck defaults
    Given the profile is "Steam Deck" at 1280 × 800
    When the game starts
    Then body text is about 19 px at 112 % interface scale
    And the game is fullscreen with Steam Deck glyphs
    And every Settings row can be used without a mouse or keyboard

  @SET-116
  Scenario: Naming a save on the Deck
    Given the profile is "Steam Deck"
    When the player names a save
    Then Steam's floating gamepad keyboard opens

  @SET-117
  Scenario Outline: Big screen at 1080p and 4K
    Given the profile is "Big screen" on a <tv> TV
    When the game starts
    Then interface scale is 175 % and text size is Large
    And text has the same physical size on both
    And the cursor speed is Slow, the screen margin is 5 % and focus outlines are always on

    Examples:
      | tv    |
      | 1080p |
      | 4K    |

  @SET-118
  Scenario Outline: Safe areas are not a setting
    Given the device has <obstacle>
    When the player looks for a setting about it
    Then none exists
    And no button sits under the <obstacle>

    Examples:
      | obstacle      |
      | a notch       |
      | a home bar    |
      | a camera hole |

  @SET-119
  Scenario Outline: Android back gesture
    Given the game runs on Android
    And <state>
    When the player uses the system back gesture
    Then <result>

    Examples:
      | state                                  | result                                   |
      | a panel is open over the map           | the top panel closes                     |
      | nothing is open over the map           | the game menu opens                     |
      | the game menu is open over the map    | the game does not quit without asking    |

  @SET-120
  Scenario: The iPhone silent switch
    Given the game runs on iOS with "Let other apps' audio play" "On"
    When the silent switch is on
    Then the game respects it through the ambient audio session

  @SET-121
  Scenario Outline: Performance knobs and Battery saver
    Given the profile is "Phone"
    When Battery saver is "<battery>"
    Then "Sharpness" is "<sharpness>", "Frame rate cap" is "<fps>", "Map detail" is "<detail>" and "Animations" is "<animations>"

    Examples:
      | battery | sharpness | fps | detail | animations |
      | Off     | Balanced  | 60  | Medium | Full       |
      | On      | Battery   | 30  | Medium | Reduced    |

  @SET-121
  Scenario: Performance targets are measured at phone defaults
    Given the shared performance targets are measured
    When the measurement runs
    Then it runs at the phone defaults
    And once more with Battery saver on
