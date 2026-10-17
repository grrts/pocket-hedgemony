@context-saves
Feature: Kinds of save and Continue
  As a player
  I want my campaign saved automatically, on my interval and by hand
  So that I can always continue and never lose more than one turn of orders

  @SAVE-001
  Scenario: A save is always a turn boundary
    Given the campaign as "Castile" is at turn 2478, May 1492
    And the player has queued 3 orders
    When any save is written
    Then the save holds the world at the start of turn 2478 and the 3 queued orders
    And it holds nothing from halfway through a turn

  @SAVE-006
  Scenario Outline: Only game state goes in a save
    Given the campaign as "Castile" is loaded
    When a save is written
    Then the save does not hold the <thing>

    Examples:
      | thing                       |
      | rules                       |
      | map shapes                  |
      | art                         |
      | settings                    |
      | purchases                   |
      | achievement progress        |

  @SAVE-007
  Scenario Outline: The Resume save follows every lifecycle point
    Given the campaign as "Castile" is loaded and is not ironman
    When the lifecycle moment "<moment>" comes
    Then the Resume save of the campaign is current
    And the campaign keeps 1 Resume save and 1 backup
    And the Resume save is not listed in Load

    Examples:
      | moment                 |
      | End turn               |
      | pause                  |
      | quit                   |
      | exit to the main menu  |
      | suspend                |

  @SAVE-007 @SAVE-026
  Scenario: Backgrounding writes only the orders journal
    Given the campaign as "Castile" is loaded and is not ironman
    When the lifecycle moment "background" comes
    Then the orders journal is written
    And no Resume save is written

  @SAVE-008 @SAVE-015 @SAVE-100
  Scenario Outline: Autosaves rotate on the chosen interval
    Given the autosave interval is "<interval>"
    And autosaves kept per campaign is <keep>
    And the campaign as "Castile" has <existing> autosaves
    When a turn starts on "<turn start>"
    Then <result>

    Examples:
      | interval        | keep | existing | turn start | result                                                            |
      | every 12 months | 3    | 3        | 1449-12-29 | a new autosave marked "Auto" is written and the oldest is removed |
      | every 12 months | 3    | 2        | 1450-03-01 | no autosave is written                                            |
      | every month     | 1    | 1        | 1450-03-01 | a new autosave marked "Auto" is written and the oldest is removed |
      | every month     | 5    | 2        | 1450-02-26 | a new autosave marked "Auto" is written and none is removed       |
      | every month     | 3    | 1        | 1450-03-08 | no autosave is written                                            |
      | every 6 months  | 3    | 1        | 1450-07-01 | a new autosave marked "Auto" is written and none is removed       |
      | every 6 months  | 3    | 1        | 1449-12-29 | a new autosave marked "Auto" is written and none is removed       |
      | every 6 months  | 3    | 1        | 1450-03-01 | no autosave is written                                            |

  @SAVE-015
  Scenario: Autosave defaults
    Given the player has never changed the autosave options
    When the autosave options are read
    Then the interval is "every 12 months (each January)"
    And autosaves kept per campaign is 3
    And the offered intervals are "every month, every 6 months, every 12 months (each January), off"
    And the offered counts are "1, 3, 5"

  @SAVE-016
  Scenario: Off stops autosaves but never the Resume save
    Given the autosave interval is "off"
    When the player ends the turn in which January begins
    Then no autosave is written
    And the Resume save is written

  @SAVE-009 @placeholder
  Scenario Outline: Manual saves have limits
    # config keys: kinds.manual.max_per_campaign, kinds.manual.max_total
    Given the campaign as "Castile" has <campaign> manual saves
    And the player has <total> manual saves in all campaigns
    When the player taps Save and picks "New save"
    Then <result>

    Examples:
      | campaign | total | result                                              |
      | 5        | 40    | a manual save is written with the player's name for it |
      | 20       | 40    | the player is asked which save to replace           |
      | 5        | 100   | the player is asked which save to replace           |

  @SAVE-010
  Scenario: Ironman save
    Given the campaign as "Castile" is ironman
    When the player ends the turn
    Then the ironman save is written
    And the campaign keeps 1 ironman save and 1 backup
    And Load shows it as the campaign itself

  @SAVE-011
  Scenario: Exported files leave the game; imported ones join Manual
    Given the campaign as "Castile" has a manual save "Castile, May 1492"
    When the player exports it 3 times
    Then 3 files leave the game with no limit applied
    When the player imports one of those files
    Then it is listed among the Manual saves

  @SAVE-012
  Scenario: One new game is one campaign
    Given the player begins a new campaign as "Castile"
    When the first save of it is written
    Then the save carries a new random campaign id
    And every later save of that game carries the same campaign id

  @SAVE-013
  Scenario: Load lists campaigns, then their saves
    Given campaigns as "Castile" and "Portugal" have saves
    When the player opens Load
    Then each campaign shows its nation banner, nation name, in-game date, turn, play time and a small map crop
    When the player opens the campaign as "Portugal"
    Then its saves are listed newest first

  @SAVE-014
  Scenario Outline: Continue opens the newest Resume or Ironman save
    Given the newest Resume or Ironman save across all campaigns is "<nation>, <date>" made on "<device>"
    And this device is "<this device>"
    When the main menu shows Continue
    Then Continue reads "<label>"

    Examples:
      | nation   | date       | device     | this device | label                                         |
      | Portugal | March 1512 | Steam Deck | Pixel 8     | Continue: Portugal, March 1512 (from Steam Deck) |
      | Castile  | May 1492   | Pixel 8    | Pixel 8     | Continue: Castile, May 1492                   |

  @SAVE-101
  Scenario Outline: Restore the last autosave
    Given the campaign as "Castile" has a Resume save and 2 autosaves
    And its Resume saves are <state>
    When the player picks "Restore the last autosave" on the failure screen
    Then the <opened> is opened

    Examples:
      | state   | opened          |
      | sound   | Resume save     |
      | damaged | newest autosave |
