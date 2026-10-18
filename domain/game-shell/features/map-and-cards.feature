@context-game-shell
Feature: Map and cards
  As a player
  I want the map always underneath and cards that open over it
  So that I never lose my place

  Background:
    Given a campaign as "France" is loaded
    And the screen "map" is shown

  @SHELL-001
  Scenario Outline: Everything closes back onto the map
    When the player opens the screen "<screen>"
    Then the screen "<screen>" is a "<kind>" over the map
    And the map stays loaded underneath
    When the player closes the screen "<screen>"
    Then the screen "map" is shown at the same camera position

    Examples:
      | screen     | kind        |
      | card       | card        |
      | realm_book | full screen |
      | siege      | full screen |
      | attention  | card        |

  @SHELL-003
  Scenario: Nothing is more than three steps from the map
    Given the player opened the province card of "Champagne"
    And from it the country card of "France"
    And from it the card of a commander
    When the player counts the Back presses to the map
    Then the map is at most 3 Back presses away

  @SHELL-045
  Scenario Outline: How each layer closes
    Given the screen of the layer "<layer>" is open
    When the player <action>
    Then <result>

    Examples:
      | layer       | action                    | result                                       |
      | map         | presses Back              | the screen "game_menu" opens                 |
      | card        | presses Back              | the card closes                              |
      | card        | presses the cross         | the card closes                              |
      | card        | taps empty map            | the card closes                              |
      | card        | folds it away             | the card shrinks to its name tab             |
      | full screen | presses Back              | the screen below is shown                    |
      | full screen | presses the cross         | the screen below is shown                    |
      | modal       | presses Back where deciding later is allowed | the modal is put off            |
      | modal       | presses Back where deciding later is not allowed | the modal stays open         |

  @SHELL-046
  Scenario: Cards stack and empty map clears them
    Given the player opened the province card of "Champagne"
    When the player opens the country card of "France" from it
    Then the country card of "France" is on top of the card stack
    When the player opens the card of a commander from it
    Then the commander card shows the button "Back to France"
    When the player taps empty map
    Then the card stack is empty

  @SHELL-047
  Scenario: Top bar
    Then the top bar shows the realm name and banner, the date, gold with its monthly change, and levies
    When the player taps the banner
    Then the country card of "France" opens

  @SHELL-047 @placeholder
  Scenario: A phone's top bar holds at most five plaques
    # config key: shell.top_bar_max_plaques_phone
    Given the shape is "Short wide"
    And new systems add plaques so that 7 plaques exist
    When the top bar is drawn
    Then the top bar shows 5 plaques
    And the other 2 move into the country card

  @SHELL-048
  Scenario: Tool column
    When the screen "map" is drawn
    Then the tool column at the right edge holds "map lens", "go to capital" and "Realm book"

  @SHELL-049
  Scenario Outline: End turn badge opens Attention
    Given the Attention screen holds 4 items
    Then the End turn button in the lower right shows the hourglass with the badge 4
    When the player <action>
    Then the screen "attention" opens

    Examples:
      | action                               |
      | taps the badge                       |
      | presses the controller's next button |

  @SHELL-050
  Scenario Outline: The bell lights only for warnings
    Given the Attention screen holds <warnings> warnings and <waiting> waiting items
    When the screen "map" is drawn
    Then the Attention bell next to the date is <bell>
    And no other place on screen warns the player

    Examples:
      | warnings | waiting | bell    |
      | 1        | 0       | lit     |
      | 0        | 3       | not lit |
      | 0        | 0       | not lit |

  @SHELL-051
  Scenario: Game menu button
    When the screen "map" is drawn
    Then a small three-line game menu button is shown in the upper left next to the banner

  @SHELL-052
  Scenario: The local zoom tile row is still the map
    When the player zooms to local zoom on "Champagne"
    Then the tile-row view is shown on the screen "map"
    And no new screen is put on the stack

  @SHELL-053 @placeholder
  Scenario: Card on a phone in landscape
    # config key: shell.card_phone_width
    Given the shape is "Short wide"
    When the player opens the province card of "Champagne"
    Then the card takes the full height of the left 45 % of the screen
    And the map stays live on the right, recentred so "Champagne" is not hidden

  @SHELL-054 @placeholder
  Scenario: Card in a tall window
    # config key: shell.card_tall_height
    Given the shape is "Tall"
    When the player opens the province card of "Champagne"
    Then the card is a bottom sheet at 55 % height
    And it can be dragged up to full height or down to a peek strip

  @SHELL-055 @placeholder
  Scenario: Card in a large window
    # config key: shell.card_large_width
    Given the shape is "Large"
    And the interface scale is 1
    When the player opens the province card of "Champagne"
    Then the card is a side sheet 380 px wide

  @SHELL-056
  Scenario Outline: A tap selects, a second tap opens
    When the player taps the province "Seine-et-Marne"
    Then "Seine-et-Marne" is selected and its name tab appears in the lower left
    And no card is open
    When the player <second action>
    Then the province card of "Seine-et-Marne" opens

    Examples:
      | second action                        |
      | taps the name tab                    |
      | taps the province "Seine-et-Marne" again |

  @SHELL-057
  Scenario: Fold away and reopen
    Given the province card of "Champagne" is open
    When the player folds the card away
    Then only the name tab "Champagne" is shown
    When the player taps the name tab
    Then the province card of "Champagne" opens again

  @SHELL-058
  Scenario: Gain and lose lists fold out inside the card
    Given the province card of "Champagne" is open
    When the player opens a line that opens its gain and lose list
    Then the list folds out inside the card
    And no new screen is put on the stack

  @SHELL-138 @feedback-6
  Scenario: Selecting an army keeps the camera still
    Given the camera shows "Champagne"
    When the player selects an army on the map
    Then the camera neither moves nor zooms

  @SHELL-139 @SHELL-140 @feedback-11 @feedback-12
  Scenario: The country card's tabs
    When the player opens a country card
    Then it has the tabs General, Diplomacy, Trade and Army in that order
    And it opens on General
    And the peace table and declare war open from the Diplomacy tab

  @SHELL-142 @feedback-21
  Scenario: Picking commanders is easy
    When the player taps a commander in the Army list
    Then that commander's army is selected
    And army banners take taps of at least 44 points

  @SHELL-159 @feedback-119
  Scenario: Back returns to the screen before
    Given the province card of "Champagne" is open
    When the player opens the country card of "France" from it
    And the player opens the Lords tab
    Then the card's header shows a Back button
    When the player presses Back
    Then the country card of "France" shows its General tab
    When the player presses Back
    Then the province card of "Champagne" is shown
    And the card's header shows no Back button
    When the player opens the country card of "France" from it
    And the player closes the card
    Then the screen history is empty
