@context-tribes
Feature: Hunting grounds on screen
  As a player
  I want to see and act on hunting grounds from the province card, one tab and the map
  So that a tribe can be played with a few taps on a phone held sideways

  @TRIBE-026
  Scenario: The province card of land next to a tribe
    Given the player plays "Cherokee", which has a free place in its range
    When the player opens the province card of "Southeast Tennessee"
    Then the card says "Land of a people with no country"
    And it shows the button "Claim as hunting ground · 3 months" at least 44 points high

  @TRIBE-026
  Scenario: A claim button that can't be used says why
    Given the player plays "Cherokee", whose range has no free place
    When the player opens the province card of "Southeast Tennessee"
    Then the claim button is greyed and "no free place" is written under it

  @TRIBE-026
  Scenario: A ground of the player's
    Given the player plays "Creek" and "North Mississippi" has been its ground 6 years
    When the player opens the province card of "North Mississippi"
    Then the card says "Hunting ground of the Creek"
    And "Take them in" is greyed with "held 6 of 10 years" under it
    And "Leave this ground" asks to confirm before it acts

  @TRIBE-027
  Scenario: The Hunting grounds tab
    Given the player plays "Iroquois" with 3 of 4 hunting grounds and one claim under way
    When the player opens the Hunting grounds tab of their realm card
    Then it shows "Hunting grounds 3 of 4" with a bar and the claim under way with its end date
    And one row per ground with its people, years held and furs, a ground ready to take in first
    And the General tab shows "Hunting grounds 3 of 4 · furs 1.5 gold a month", opening this tab

  @TRIBE-027
  Scenario: Settlers show at the top of the tab
    Given the player plays "Creek" and "Castile" is founding a colony on its ground "Southeast Mississippi"
    When the player opens the Hunting grounds tab
    Then the colony is listed first, in red, with "Go there"

  @TRIBE-028
  Scenario: Grounds on the map
    Given "Vermont" is a hunting ground of "Iroquois"
    When the map is drawn at any zoom with the political or Charts lens
    Then "Vermont" shows a light diagonal hatch in the colour of "Iroquois"
    And in the Charts lens of a colonial player its coast is amber, not green

  @TRIBE-029
  Scenario: Founding on a ground
    Given the player plays "Castile" with a fleet carrying a governor off "Southeast Mississippi"
    And "Southeast Mississippi" is a hunting ground of "Creek"
    When the player opens the fleet card's Colony section
    Then it says "Hunting ground of the Creek: settling here angers them"
    And "Ask for the land" stands beside "Found colony"

  @TRIBE-029
  Scenario: The tribe's alert
    Given the player plays "Creek"
    When "Castile" starts founding a colony on the Creek's ground "Southeast Mississippi"
    Then a short alert over the map says "Settlers on our land: Castile at Southeast Mississippi" with "Go there"
    And the dispatches keep it

  @TRIBE-030
  Scenario Outline: Phone layouts
    Given the game runs on a phone in the <layout> layout
    When the player opens the Hunting grounds tab and a province card with claim buttons
    Then every button is at least 44 points high and no reason is shown only on hover
    And the tab's rows stack in one column with no sideways scrolling

    Examples:
      | layout |
      | Wide   |
      | Tall   |
