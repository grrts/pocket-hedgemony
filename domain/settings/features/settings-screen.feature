@context-settings
Feature: The Settings screen
  As a player
  I want one Settings screen that previews every change and works with any input
  So that I can fix what I need without losing my place

  @SET-003
  Scenario: Changes apply at once with a preview
    Given the Settings screen is open over the map
    When the player changes "Text size" to "Large"
    Then the text behind the open panel is Large at once
    And there is no Apply button

  @SET-003 @SET-035
  Scenario Outline: Display mode asks to keep
    Given the game runs on desktop in "Windowed"
    When the player changes "Display mode" to "Fullscreen"
    Then the question "Keep this display?" is shown
    When the player <answer>
    Then the display mode is "<result>"

    Examples:
      | answer                              | result     |
      | confirms                            | Fullscreen |
      | does nothing for 15 seconds         | Windowed   |

  @SET-004
  Scenario Outline: Every row works with every input
    Given the Settings screen is open
    When the player changes the slider "Master volume" with <input>
    Then the value changes in steps of 5 %

    Examples:
      | input                         |
      | the d-pad                     |
      | the arrow keys                |
      | a tap at a position on it     |
      | a mouse click at a position   |

  @SET-005
  Scenario: Settings mid-campaign loses nothing
    Given a campaign as "France" is loaded with the camera on "Champagne"
    And the player has queued 2 orders
    When the player opens Settings from the game menu and closes it
    Then the camera is on "Champagne" at the same spot
    And the 2 orders are still queued

  @SET-007
  Scenario: Settings from the title screen
    Given the title screen is shown
    When the player opens Settings
    Then the Settings screen opens

  @SET-008
  Scenario: Settings from the game menu, with Campaign rules inside
    Given a campaign as "France" is loaded
    When the player opens the game menu
    Then it offers Settings, opening over the dimmed map
    And Settings holds Campaign rules, a read-only section

  @SET-009
  Scenario Outline: Shortcuts into Settings
    Given a campaign is loaded on "<platform>"
    When the player presses "<button>"
    Then the game menu opens, from which Settings opens

    Examples:
      | platform | button      |
      | desktop  | Esc         |
      | Steam    | Menu button |

  @SET-009 @SET-091
  Scenario: Steam's own binding panel
    Given the game runs on Steam
    When the player opens the Controller part of the Controls section
    Then a button opens Steam's own binding panel

  @SET-010
  Scenario Outline: First-launch questions only when needed
    Given the game launches for the first time on the profile "<profile>"
    And the system language <supported>
    And the privacy design <consent> consent
    When the first-launch questions run
    Then the questions shown are "<questions>"
    And no settings wizard is shown

    Examples:
      | profile    | supported          | consent          | questions                                       |
      | Phone      | is supported       | does not require | none                                            |
      | Phone      | is not supported   | requires         | Language, Crash reports and usage statistics    |
      | Big screen | is supported       | does not require | Is this text easy to read?                      |

  @SET-010
  Scenario Outline: Text readability on the Big screen
    Given the question "Is this text easy to read?" is shown on the Big screen profile
    When the player answers "<answer>"
    Then the text is <result>

    Examples:
      | answer  | result               |
      | Smaller | made smaller         |
      | Fine    | kept as it is        |
      | Bigger  | made bigger          |

  @SET-011 @SET-012
  Scenario Outline: Layout by orientation
    Given the window is <window>
    When the player opens Settings
    Then <layout>

    Examples:
      | window                         | layout                                                                                  |
      | landscape                      | the section list is on the left, the rows on the right, and the focused row's one-line description at the bottom |
      | a tablet in portrait           | the section list is shown first and a section opens its rows full screen, Back returning |
      | a desktop window taller than wide | the section list is shown first and a section opens its rows full screen, Back returning |

  @SET-013
  Scenario: Section order
    Given the game is running
    When the player opens Settings
    Then the sections are "Gameplay, Graphics, Audio, Controls, Accessibility, Language, Account and cloud saves, Privacy, About" in that order

  @SET-014
  Scenario Outline: The changed dot
    Given the profile is "Phone"
    When "Map detail" is "<value>"
    Then the row shows its name, the value "<value>" and <dot>

    Examples:
      | value  | dot                 |
      | Medium | no changed dot      |
      | High   | the changed dot     |

  @SET-015
  Scenario Outline: Resetting a row
    Given the profile is "Phone" and "Map detail" is "High"
    When the player <action> on the row "Map detail"
    Then "Map detail" is "Medium"

    Examples:
      | action                |
      | long-presses          |
      | right-clicks          |
      | presses X             |

  @SET-015
  Scenario Outline: Resetting a section or everything
    Given the player changed rows in Graphics and Audio
    When the player picks "<reset>"
    Then <result>

    Examples:
      | reset                                | result                                             |
      | Reset this section at the end of Graphics | every Graphics row is back to its profile default, Audio unchanged |
      | Reset all settings in About          | every row is back to its profile default           |

  @SET-016
  Scenario Outline: Controller navigation
    Given the Settings screen is open with a controller
    When the player presses "<button>"
    Then <result>

    Examples:
      | button          | result                               |
      | LB              | the previous section opens           |
      | RB              | the next section opens               |
      | d-pad down      | focus moves to the next row          |
      | A               | the focused row changes or opens     |
      | d-pad right     | the focused value steps up           |
      | B               | Settings goes back                   |
      | X               | the focused row resets               |
      | Y               | the long description is shown        |
