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
      | Lands     | Provinces, Officials, Lords, Colonies  |
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
