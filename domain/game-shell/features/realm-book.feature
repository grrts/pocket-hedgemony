@context-game-shell
Feature: Realm book
  As a player
  I want my realm's screens in six sections grouped by what I am doing
  So that I find a page without scanning a long row of tabs

  Background:
    Given a campaign as "France" is loaded

  @SHELL-059 @SHELL-165
  Scenario Outline: Sections and the pages they hold
    When the player opens the Realm book on the tab "<tab>"
    Then the tab "<tab>" holds "<holds>"

    Examples:
      | tab       | holds                                  |
      | Realm     | Overview, Government, Heritage, Score  |
      | Economy   | Treasury, Trade, Food                  |
      | Lands     | Provinces, Officials, Lords, Colonies, Hunting grounds |
      | Military  | Army, Navy                             |
      | Diplomacy | Diplomacy                              |
      | Research  | Research, Peoples                      |

  @SHELL-059
  Scenario: The book opens on the last tab used
    Given the player last closed the Realm book on the tab "Military"
    When the player opens the Realm book from the tool column
    Then the tab "Military" is shown

  @SHELL-060
  Scenario: Never a seventh tab
    Given a new system needs a place in the Realm book
    When the system is added
    Then it adds a section inside one of the six tabs
    And the Realm book has 6 tabs

  @SHELL-167
  Scenario Outline: Sections in every shape
    Given the shape is "<shape>"
    When the player opens the Realm book
    Then the sections are shown as one row of icons with names under the card's title

    Examples:
      | shape      |
      | Short wide |
      | Tall       |
      | Large      |

  @SHELL-165
  Scenario: Every page has one section
    Then each page of the Realm book sits in exactly one section
    And the page "Food" sits in the section "Economy"

  @SHELL-170
  Scenario: The overview has a tile per section
    Given the realm stands as:
      | gold      | 1200 |
      | perMonth  | 5.5  |
      | provinces | 12   |
      | people    | 1800000 |
      | armies    | 3    |
      | men       | 14000 |
      | fleets    | 1    |
      | allies    | 2    |
      | study     | Plough, 40 |
    When the player opens the Realm book's Overview
    Then the overview tiles are "Economy, Lands, Military, Diplomacy, Research"
    And the tile "Economy" reads "1,200 gold · +5.5 a month" with the note "All provinces fed"
    And the tile "Lands" reads "12 provinces" with the note "1,800,000 people"
    And the tile "Military" reads "3 armies · 14,000 men" with the note "1 fleet"
    And the tile "Diplomacy" reads "At peace" with the note "2 allies"
    And the tile "Research" reads "Plough · 40 %" with the note "Studying"
    And no tile is marked

  @SHELL-171
  Scenario Outline: A tile names what waits and opens it
    Given the realm stands as:
      | <what> | <count> |
    When the player opens the Realm book's Overview
    Then the tile "<tile>" is marked "<needs>"
    And tapping the tile "<tile>" opens the page "<page>"

    Examples:
      | what        | count | tile      | needs                         | page            |
      | hungry      | 2     | Economy   | 2 provinces hungry            | Food            |
      | perMonth    | -3    | Economy   | Losing gold each month        | Treasury        |
      | newLands    | 1     | Lands     | 1 new land to fill            | Officials       |
      | verdicts    | 2     | Lands     | 2 beaten risings to judge     | Provinces       |
      | risings     | 1     | Lands     | 1 uprising                    | Provinces       |
      | huntWaits   | 1     | Lands     | Settlers wait on your grounds | Hunting grounds |
      | answerWaits | 1     | Diplomacy | An answer waits               | Diplomacy       |
      | study       | none  | Research  | Choose what to study          | Research        |
      | beliefLow   | 1     | Research  | Faith or language low         | Peoples         |

  @SHELL-062
  Scenario: Show on map and back to the same place
    Given the Realm book is open on the tab "Military" scrolled to the army "Armée de Dunois"
    When the player presses "Show on map" on the army "Armée de Dunois"
    Then the book closes, the camera moves to the army and its card opens
    When the player presses Back
    Then the Realm book is open on the tab "Military" at the same scroll position

  @SHELL-063
  Scenario: A book screen opened from a card returns to the card
    Given the province card of "Champagne" is open
    When the player opens the Levy screen from the card
    Then the Levy screen is stacked on the province card
    When the player presses Back
    Then the province card of "Champagne" is shown
