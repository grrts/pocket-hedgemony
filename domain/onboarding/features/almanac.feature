@context-onboarding
Feature: The Almanac
  As any player
  I want an offline encyclopedia that holds the full rules
  So that I can look anything up without leaving the game

  @TUT-090
  Scenario Outline: Where the Almanac opens from
    When the player opens the Almanac from <place>
    Then the Almanac opens offline

    Examples:
      | place |
      | the pause menu |
      | a linked word |
      | a "Why?" |

  @TUT-091
  Scenario Outline: The sections
    When the player opens the Almanac section "<section>"
    Then it holds <contents>

    Examples:
      | section | contents |
      | How to play | one page per system, matching the tutorial chapters |
      | Stats | one entry per stat with its gain and lose list and the screens that show it |
      | Inventions | each invention, what it needs and what it unlocks |
      | Troops and commanders | arms, kinds and commander styles by era |
      | Ground | the 22 tile types and what each does to troops, buildings and people |
      | Realms | every catalogue country met so far |
      | Events seen | the events fired in this campaign with their history block |

  @TUT-092
  Scenario: Practice this
    When the player presses Practice this on the How to play page for food
    Then the tutorial chapter "Bread and castles" opens

  @TUT-093
  Scenario: Realms are hidden until met
    Given the country "Ming" has not been met
    Then the Almanac's Realms section does not show "Ming"

  @TUT-094
  Scenario Outline: Search
    Given the player uses "<input>"
    When the player searches the Almanac
    Then the search uses <entry>

    Examples:
      | input | entry |
      | touch | a text box |
      | controller | a letter wheel, never the full keyboard |

  @TUT-095 @TUT-096
  Scenario: Numbers follow the config
    Given the Almanac's Stats entry for the army food warning says 15 days
    When a balance patch changes the config value
    Then the Almanac shows the new value without anyone rewriting it
    And the entry keeps the cards' parchment, ribbons and pixel icons

  @TUT-097
  Scenario: Tips point at pages not yet opened
    Given the player has opened the Almanac page on castles but not the page on sieges
    When a loading screen picks a tip
    Then it prefers a tip linked to an unopened page such as sieges
    And the tip links to its Almanac entry
