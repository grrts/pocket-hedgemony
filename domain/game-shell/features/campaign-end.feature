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
      | Look back                    | the News opens read-only                                     |
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

  @SHELL-098 @SHELL-129
  Scenario Outline: World domination wins at once
    Given a campaign as "Ottomans" is loaded
    And "Ottomans" owns or holds as subjects <held> of the world's 2000 settled land provinces
    When the turn of <month> 1700 ends
    Then <result>

    Examples:
      | held | month    | result                                                       |
      | 2000 | January  | the win "World domination" fires and campaign end starts     |
      | 1999 | January  | no win fires                                                 |
      | 1000 | January  | no win fires                                                 |
      | 2000 | June     | no win fires                                                 |

  @SHELL-129
  Scenario: Keep playing after world domination
    Given a campaign as "Ottomans" has won by world domination in January 1700
    When the screen "final_result" is shown
    Then it offers "Keep playing, Main menu, Credits"
    When the player picks "Keep playing"
    Then the screen "map" is shown
    And the campaign can be played until its end date

  @SHELL-098 @SHELL-130
  Scenario Outline: Score winners at the end date
    Given at the end date the scores are:
      | realm    | Economy | Power | Technology |
      | Ottomans | 900     | 700   | 400        |
      | France   | 800     | 950   | 400        |
      | England  | 600     | 500   | 380        |
    When the end date is reached in a campaign as "<player>"
    Then the outcome reads "<outcome>"

    Examples:
      | player   | outcome                                    |
      | Ottomans | Victory: Economy, Technology (shared: Technology) |
      | France   | Victory: Power, Technology (shared: Technology)   |
      | England  | No victory · Economy 3rd · Power 3rd · Technology 3rd |

  @SHELL-130
  Scenario: No win shows the player's rank
    Given at the end date the scores are:
      | realm    | Economy | Power | Technology |
      | Ottomans | 900     | 700   | 500        |
      | France   | 800     | 950   | 400        |
      | Portugal | 850     | 300   | 450        |
    When the end date is reached in a campaign as "Portugal"
    Then the outcome reads "No victory · Economy 2nd · Power 3rd · Technology 2nd"
    And the ledger shows "Ottomans, France, Portugal"

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

  @SHELL-099
  Scenario: Final result outside ironman
    Given a campaign as "France" that is not ironman reaches its end date
    When the screen "final_result" is shown
    Then instead of a list of achievements it reads "Achievements are earned only in ironman campaigns"

  @SHELL-162 @SHELL-163
  Scenario: The score line and the Score card
    Given a game as "france" begins
    Then every realm's card shows its three scores with a rank in each
    And the player's Score card shows Economy as yearly income plus the bank and Power as provinces plus army power
    And the score ledger lists the five leading realms and the player

  @SHELL-164
  Scenario: The end card when the end date comes
    Given a game as "france" begins with the end date "1444-11-13"
    When the game plays 3 days
    Then the end card reads "The campaign ends · 13 November 1444"
    And the end card offers "Look at the map, New game"
    And the clock no longer runs

  @SHELL-164
  Scenario: The end card at game over
    Given a game as "france" begins
    When "england" takes two thirds of the lands of "france" and "burgundy" the rest
    And the game plays 7 days
    Then the end card reads "France was divided between England and Burgundy · 1444"
    And the end card offers "Play on as another realm, New game"
    When the player chooses to play on as "burgundy"
    Then the clock runs again as "burgundy"

  @SHELL-164
  Scenario: The end card after world domination
    Given a game as "france" begins
    And "france" holds every land province
    When the game plays into January 1445
    Then the end card reads "World domination · 1445"
    And the end card offers "Keep playing, New game"
    When the player chooses to keep playing
    Then the clock runs again as "france"
