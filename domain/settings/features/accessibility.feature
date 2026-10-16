@context-settings
Feature: Accessibility settings
  As a player who reads colour, text or motion differently
  I want the map and panels to adapt
  So that a map read by colour still reads for me

  @SET-095
  Scenario Outline: Colour vision
    Given "Colour vision" is "<mode>"
    When the realms lens is drawn
    Then <result>

    Examples:
      | mode                  | result                                                                                              |
      | Default               | the nation colours are the first assignment from the 32-colour palette                             |
      | Red-weak (protan)     | the nation colours are a second assignment from the same palette where neighbours stay distinguishable, and lens ramps run blue to orange |
      | Green-weak (deutan)   | the nation colours are a second assignment from the same palette where neighbours stay distinguishable, and lens ramps run blue to orange |
      | Blue-weak (tritan)    | the nation colours are a second assignment from the same palette where neighbours stay distinguishable, and lens ramps use a safe ramp |
      | No colour             | greys with patterns are used                                                                        |

  @SET-096 @SET-124
  Scenario: No colour turns patterns on
    Given "Patterns on lenses" is "Off"
    When the player sets "Colour vision" to "No colour"
    Then "Patterns on lenses" is "On" and shows "Set by Colour vision"
    And each lens band reads by hatching, dots or stripes

  @SET-097
  Scenario Outline: Borders
    Given "Borders" is "<value>"
    When nation borders are drawn
    Then they are <look>

    Examples:
      | value         | look                                              |
      | Normal        | normal                                            |
      | Thick         | thick                                             |
      | High contrast | black and white ink, two art pixels wide           |

  @SET-098
  Scenario Outline: Text size
    Given the interface scale is 100 %
    When "Text size" is "<size>"
    Then body text is <px> px
    And panels reflow and cards grow taller, not smaller

    Examples:
      | size   | px |
      | Normal | 17 |
      | Large  | 20 |
      | Larger | 24 |

  @SET-099
  Scenario Outline: Font
    Given "Font" is "<font>"
    When a panel is drawn
    Then body text uses <body> and titles use <titles>

    Examples:
      | font  | body                                      | titles                                   |
      | Pixel | Pixelify Sans                             | Jacquard 12                              |
      | Plain | a clear OFL-licensed sans such as Atkinson Hyperlegible | the same clear sans        |

  @SET-100
  Scenario: High contrast panels
    Given "High contrast panels" is "On"
    When a card is drawn
    Then its background is solid instead of parchment
    And outlines are stronger
    And no text is over a pattern

  @SET-101
  Scenario Outline: Touch target size
    Given "Touch target size" is "<size>"
    When any screen is shown
    Then every tap target is at least <points> points

    Examples:
      | size   | points |
      | Normal | 44     |
      | Large  | 56     |

  @SET-102
  Scenario Outline: Reduced motion
    Given "Reduced motion" is "<value>"
    And the operating system <os> reduced motion
    When the camera jumps to an event
    Then <result>

    Examples:
      | value          | os            | result                                                           |
      | Follow system  | asks for      | the camera cuts, there is no screen shake and Animations is Reduced |
      | Follow system  | doesn't ask for | the camera glides                                              |
      | On             | doesn't ask for | the camera cuts, there is no screen shake and Animations is Reduced |
      | Off            | asks for      | the camera glides                                                |

  @SET-103
  Scenario: No flashes
    Given "No flashes" is "On"
    When a battle with cannon ends
    Then no cannon flash, lightning or white flash on the result is shown

  @SET-104
  Scenario Outline: Hold actions
    Given "Hold actions" is "<value>"
    When the player opens the action menu on the map
    Then it opens by <way>

    Examples:
      | value | way                |
      | On    | a hold             |
      | Off   | a double press     |

  @SET-105
  Scenario: Screen reader support
    Given the operating system's screen reader is on
    When the player selects the province "Champagne"
    Then the province card of "Champagne" is read out with its labels
    And the map itself is not narrated
