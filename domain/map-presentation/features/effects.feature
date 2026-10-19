@context-map-presentation
Feature: Particles and animations on the map
  As a player
  I want the map to react when something happens and the land to move between turns
  So that a week playing out feels alive and I see where things happened

  @VIEW-140 @placeholder
  Scenario: A province changing hands throws confetti in the new holder's colour
    Given province 3 is held by realm 1
    When a played day leaves it occupied by realm 2
    Then a "flip" moment plays at province 3 in realm 2's colour

  @VIEW-140
  Scenario: The first snapshot of a session plays no flips
    Given no snapshot before this one
    When the day's moments are worked out
    Then no moment plays

  @VIEW-141
  Scenario: A finished work raises dust and sparkles
    Given the day's news says a work of the player's is finished at province 5
    When the day's moments are worked out
    Then a "built" moment plays at province 5

  @VIEW-142
  Scenario: A rising sends up smoke and embers
    Given the day's news says a rising begins at province 7
    When the day's moments are worked out
    Then a "rising" moment plays at province 7

  @VIEW-143
  Scenario: One gold shower over the capital for the realm's news
    Given the day's news says the player's realm learned an invention and passed a reform
    When the day's moments are worked out
    Then exactly one "glory" moment plays, at the player's capital

  @VIEW-144
  Scenario: Plague breaking out lets motes drift up
    Given province 9 had a plague rumour
    When a played day brings the outbreak there
    Then a "plague" moment plays at province 9

  @VIEW-145 @placeholder
  Scenario Outline: Animations decides how much plays
    Given Animations is "<animations>"
    When a "flip" moment plays
    Then it takes <particles> particles

    Examples:
      | animations | particles |
      | Full       | 24        |
      | Reduced    | 12        |
      | Off        | 0         |

  @VIEW-145
  Scenario Outline: Looping effects run only at full animations without Battery saver
    Given Animations is "<animations>"
    And Battery saver is switched <battery>
    Then the looping effects <run>

    Examples:
      | animations | battery | run      |
      | Full       | off     | run      |
      | Full       | on      | stop     |
      | Reduced    | off     | stop     |

  @VIEW-140 @placeholder
  Scenario Outline: Moments play from Region zoom in
    Given the camera zoom is <zoom>
    Then moments <play>

    Examples:
      | zoom | play       |
      | 1    | do not play |
      | 2    | play       |
      | 16   | play       |

  @VIEW-146 @placeholder
  Scenario Outline: Bigger towns smoke from more chimneys
    Given a town of <core> core cells
    Then <chimneys> chimneys smoke over it

    Examples:
      | core | chimneys |
      | 0    | 0        |
      | 1    | 1        |
      | 6    | 2        |
      | 30   | 3        |

  @VIEW-147 @placeholder
  Scenario Outline: Snow falls below freezing
    Given a province at <celsius> °C
    Then snow <falls>

    Examples:
      | celsius | falls        |
      | -5      | falls        |
      | 0       | does not fall |
      | 12      | does not fall |
