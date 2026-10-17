@context-game-shell
Feature: How a campaign ends
  As a player
  I want a clear ending when my realm falls, when I win, or when the end date comes
  So that a long campaign closes with a result worth seeing

  @SHELL-094
  Scenario Outline: Game over when the realm no longer exists
    Given a campaign as "Burgundy" is loaded
    When <cause> in 1477
    Then the map zooms out over the old borders of "Burgundy"
    And the track "game_over" plays
    And a card says how it ended in one line with the date 1477
    And the card shows the realm's largest size, years lasted and battles won

    Examples:
      | cause                                                   |
      | "Burgundy" is annexed                                   |
      | "Burgundy" loses every province                         |
      | a successor rule ends "Burgundy"                        |

  @SHELL-094
  Scenario: The game over line names what happened
    Given a campaign as "Burgundy" is loaded
    When "Burgundy" is divided between "France" and the Empire in 1477
    Then the game over card reads "Burgundy was divided between France and the Empire · 1477"

  @SHELL-095
  Scenario Outline: Choices after game over
    Given the screen "game_over" is shown for "Burgundy"
    When the player picks "<choice>"
    Then <result>

    Examples:
      | choice                       | result                                                      |
      | Look back                    | the tab "Chronicle" opens read-only                          |
      | Play on as another realm     | the player can pick any realm on the current map             |
      | Main menu                    | the main menu is shown                                       |

  @SHELL-096
  Scenario Outline: Playing on ends achievements, ironman included
    Given the screen "game_over" is shown for "Burgundy"
    And the campaign <ironman>
    Then the button "Play on as another realm" says "Achievements end for this campaign" before it is pressed
    When the player plays on as "France"
    Then the campaign continues as "France"
    And the campaign can no longer earn achievements
    And the choice cannot be undone

    Examples:
      | ironman        |
      | is ironman     |
      | is not ironman |

  @SHELL-097 @SHELL-100
  Scenario: Reaching the end date
    Given a campaign as "France" with the end date 31 August 1939
    When the date reaches 31 August 1939
    Then the final wrap-up events open as normal event cards
    And then the map at world zoom steps through the borders of "France" by era while the track "campaign_end" plays
    And then the screen "final_result" opens
    And the campaign cannot be played past the end date

  @SHELL-100
  Scenario: The end date is the one chosen at the start
    Given a new campaign is begun with the end date chosen on the options step
    When the campaign is loaded later
    Then its end date is the one chosen when it started

  @SHELL-098 @open-question
  Scenario Outline: A victory condition ends the campaign
    # OQ-SHELL-1: how each score is measured and when it is judged is not designed
    Given a campaign as "Ottomans" is loaded
    When "Ottomans" <wins>
    Then a victory condition fires
    And the campaign end sequence starts

    Examples:
      | wins                                    |
      | achieves world domination               |
      | leads the Economy score when judged     |
      | leads the Power score when judged       |
      | leads the Technology score when judged  |

  @SHELL-099
  Scenario Outline: Final result
    Given the screen "final_result" is shown
    Then it shows the ledger comparison and the final outcome
    And it shows the achievements earned in this campaign
    When the player picks "<choice>"
    Then the screen "<next>" is shown

    Examples:
      | choice    | next      |
      | Main menu | main_menu |
      | Credits   | credits   |
