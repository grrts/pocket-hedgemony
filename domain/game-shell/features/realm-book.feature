@context-game-shell
Feature: Realm book
  As a player
  I want the realm-wide screens in one tabbed book
  So that the map's tool column stays short

  Background:
    Given a campaign as "France" is loaded

  @SHELL-059
  Scenario Outline: Tabs and what they hold
    When the player opens the Realm book on the tab "<tab>"
    Then the tab "<tab>" holds "<holds>"

    Examples:
      | tab       | holds                                                                    |
      | Realm     | country card in full, ruler and family, lords, government                |
      | Treasury  | treasury, Tax screen, Food policy screen, trade                          |
      | Army      | all armies and fleets, commanders, levy, commission, troop cap           |
      | Abroad    | diplomacy, relations, subjects, wars and peace voices                    |
      | Learning  | schools, research tree, religion and culture                             |
      | Chronicle | past turn reports, event log, battle reports, ledger                     |

  @SHELL-059
  Scenario: The book opens on the last tab used
    Given the player last closed the Realm book on the tab "Army"
    When the player opens the Realm book from the tool column
    Then the tab "Army" is shown

  @SHELL-060
  Scenario: Never a seventh tab
    Given a new system needs a place in the Realm book
    When the system is added
    Then it adds a section inside one of the six tabs
    And the Realm book has 6 tabs

  @SHELL-061
  Scenario Outline: Tabs by window shape
    Given the shape is "<shape>"
    When the player opens the Realm book
    Then the tabs are shown as <tabs>

    Examples:
      | shape      | tabs                                  |
      | Short wide | a narrow left rail of icons           |
      | Tall       | a row of icons along the bottom       |
      | Large      | icon and name on a left rail          |

  @SHELL-062
  Scenario: Show on map and back to the same place
    Given the Realm book is open on the tab "Army" scrolled to the army "Armée de Dunois"
    When the player presses "Show on map" on the army "Armée de Dunois"
    Then the book closes, the camera moves to the army and its card opens
    When the player presses Back
    Then the Realm book is open on the tab "Army" at the same scroll position

  @SHELL-063
  Scenario: A book screen opened from a card returns to the card
    Given the province card of "Champagne" is open
    When the player opens the Levy screen from the card
    Then the Levy screen is stacked on the province card
    When the player presses Back
    Then the province card of "Champagne" is shown
