@context-settings
Feature: Settings as data
  As the game
  I want every setting described in settings.yaml and tested from it
  So that adding or changing a setting needs no code

  @SET-001
  Scenario: The screen is built from the file
    Given settings.yaml lists "gameplay.autosave" before "gameplay.autosaves_kept"
    When the Settings screen is built
    Then "Autosave" is shown above "Autosaves kept per campaign"

  @SET-001
  Scenario: Changing a default needs no code change
    Given settings.yaml sets the default of "audio.master" to 80
    When the default is changed to 70 in the file only
    Then the game uses 70 as the default of "Master volume"

  @SET-122
  Scenario: An entry's fields
    Given the entry "graphics.battery_saver" in settings.yaml
    When it is read
    Then it has the id "graphics.battery_saver", which is also its key in the settings files
    And section "graphics", type "choice", options "off, auto, on" and default "off"
    And default_by_profile "phone: auto, tablet: auto, steam_deck: auto"
    And platforms, hide_on, applies "live", sync "device" and sets_when_on

  @SET-122
  Scenario Outline: Rows hide where Steam Input owns them
    Given the entry "<id>" has hide_on "steam"
    When the Settings screen is built on Steam
    Then the row "<id>" is not shown

    Examples:
      | id                 |
      | controls.deadzone  |
      | controls.gyro_cursor |
      | controls.pad       |

  @SET-123
  Scenario Outline: Slider and action entries
    Given the entry "<id>" of type "<type>"
    When it is read
    Then it has <fields>

    Examples:
      | id                     | type   | fields                       |
      | audio.master           | slider | min 0, max 100 and step 5    |
      | graphics.screen_margins | slider | min 0, max 10 and step 1    |
      | about.restore_purchases | action | a button and no value       |

  @SET-124
  Scenario: Driven rows can still be changed
    Given "Battery saver" is "On"
    And "Frame rate cap" shows "Set by Battery saver"
    When the player sets "Frame rate cap" to 60
    Then "Frame rate cap" is 60

  @SET-125
  Scenario: Names come from string tables
    Given the entry "graphics.battery_saver"
    When its row is drawn
    Then its name is the string "settings.graphics.battery_saver.name"
    And its description is the string "settings.graphics.battery_saver.desc"
    And no display text is in settings.yaml

  @SET-126
  Scenario Outline: Keyboard-only smoke test on every profile
    Given the smoke test runs on the profile "<profile>"
    When it steps through every row of Settings with the keyboard only
    Then focus is never lost
    And every row is reached

    Examples:
      | profile    |
      | Phone      |
      | Tablet     |
      | Desktop    |
      | Steam Deck |
      | Big screen |

  @SET-127
  Scenario Outline: Schema test
    Given settings.yaml <problem>
    When the schema test runs
    Then it fails

    Examples:
      | problem                                                |
      | does not load                                          |
      | has a default that is not one of its options           |
      | names a string key missing in English                  |

  @SET-128
  Scenario Outline: Colour vision screenshots
    Given "Colour vision" is "<mode>"
    When the accessibility checks run
    Then a screenshot of the map is run through a colour-blindness simulator

    Examples:
      | mode                |
      | Default             |
      | Red-weak (protan)   |
      | Green-weak (deutan) |
      | Blue-weak (tritan)  |
      | No colour           |

  @SET-129
  Scenario: Steam Deck check
    Given the game runs on a Steam Deck held at arm's length
    When a tester goes through Settings with the built-in controls only
    Then every row is reachable
    And its text is legible
