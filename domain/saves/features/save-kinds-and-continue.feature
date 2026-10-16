@context-saves
Feature: Kinds of save and Continue
  As a player
  I want my campaign saved automatically, on my interval and by hand
  So that I can always continue and never lose more than one turn of orders

  @SAVE-001
  Scenario: A save is always a turn boundary
    Given the campaign as "Castile" is at turn 577, May 1492
    And the player has queued 3 orders
    When any save is written
    Then the save holds the world at the start of turn 577 and the 3 queued orders
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

  @SAVE-007 @open-question
  Scenario Outline: The Resume save follows every lifecycle point
    # OQ-SAVE-2: on backgrounding the design also says only the journal is written
    Given the campaign as "Castile" is loaded and is not ironman
    When <trigger>
    Then the Resume save of the campaign is current
    And the campaign keeps 1 Resume save and 1 backup
    And the Resume save is not listed in Load

    Examples:
      | trigger                        |
      | the player ends the turn       |
      | the player pauses              |
      | the player quits               |
      | the app is suspended           |
      | the app is backgrounded        |

  @SAVE-008 @SAVE-015
  Scenario Outline: Autosaves rotate on the chosen interval
    Given the autosave interval is "<interval>"
    And autosaves kept per campaign is <keep>
    And the campaign as "Castile" has <existing> autosaves
    When a turn starts in <month>
    Then <result>

    Examples:
      | interval        | keep | existing | month    | result                                                       |
      | every 12 turns  | 3    | 3        | January  | a new autosave marked "Auto" is written and the oldest is removed |
      | every 12 turns  | 3    | 2        | March    | no autosave is written                                       |
      | every turn      | 1    | 1        | March    | a new autosave marked "Auto" is written and the oldest is removed |
      | every turn      | 5    | 2        | March    | a new autosave marked "Auto" is written and none is removed  |

  @SAVE-015
  Scenario: Autosave defaults
    Given the player has never changed the autosave options
    When the autosave options are read
    Then the interval is "every 12 turns (each January)"
    And autosaves kept per campaign is 3
    And the offered intervals are "every turn, every 6 turns, every 12 turns (each January), off"
    And the offered counts are "1, 3, 5"

  @SAVE-016
  Scenario: Off stops autosaves but never the Resume save
    Given the autosave interval is "off"
    When the player ends the turn in January
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
