@context-map-presentation
Feature: Layout by window shape
  As a player on any device
  I want screens laid out for the shape of my window
  So that the map stays in view on a phone, a tablet, a desktop or a TV

  @VIEW-039 @VIEW-040 @VIEW-041 @VIEW-042 @VIEW-043
  Scenario Outline: The window shape decides the layout
    Given the window is "<window>"
    When a card is opened during a campaign
    Then the shape is "<shape>"
    And the card is <card>
    And the Realm book's tabs are <tabs>

    Examples:
      | window                               | shape      | card                                   | tabs                    |
      | a phone in landscape, 390 px high    | Short wide | a side sheet on the left 45 %          | a left icon rail        |
      | a tablet in portrait                 | Tall       | a bottom sheet at 55 % height          | a bottom icon row       |
      | a desktop window wider than tall     | Large      | a side sheet 380 px wide               | icons with names on a left rail |
      | a Steam Deck at 1280 × 800           | Large      | a side sheet 380 px wide               | icons with names on a left rail |
      | a TV                                 | Far        | a side sheet at raised scale           | icons with names on a left rail |

  @VIEW-043
  Scenario: The Far layout keeps clear of the overscan band
    Given the window is a TV
    When any screen is shown
    Then body text is about 1/30 of the screen height
    And nothing is drawn in the outer 5 % of the screen

  @VIEW-044
  Scenario: Phones play in landscape only
    Given the game runs on a phone
    When the phone is held upright
    Then the notice "Turn your phone sideways" is shown

  @VIEW-045 @placeholder
  Scenario Outline: Tap targets are large and the risky buttons are apart
    Given the touch target size is "<size>"
    When the map screen is laid out
    Then every tap target is at least <points> points square with 8 points between neighbours
    And End turn and the game menu button sit at opposite corners
    And no button sits in a system safe area

    Examples:
      | size   | points |
      | Normal | 44     |
      | Large  | 56     |

  @VIEW-046
  Scenario: A card on a phone keeps the selected thing in view
    Given the window is a phone in landscape
    And the province "Edirne" is selected near the left edge
    When its card opens
    Then the map stays live on the right
    And it is recentred so "Edirne" isn't hidden
