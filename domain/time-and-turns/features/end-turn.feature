@context-time-and-turns
Feature: Orders and End turn
  As a player or an AI country
  I want my orders queued during the turn and applied when the turn ends
  So that turns are reproducible and the same rules hold for everyone

  @TIME-011 @TIME-039
  Scenario: The AI and the player send the same orders as data
    Given the country "France" is played by the player
    And the country "Burgundy" is run by the AI
    When each gives a move order for one of its armies
    Then both orders have the same shape "move army to province"
    And both are applied by the same End turn pipeline

  @TIME-012
  Scenario: Orders given during the turn are queued, not applied
    Given the army of "Jean de Dunois" stands in "Paris"
    When the player orders it to march to "Dijon"
    Then the army still stands in "Paris"
    And the order waits in the queue until End turn

  @TIME-013
  Scenario: Queued orders are applied before any phase runs
    Given the day is "27 November 1444"
    And the player has queued a move order for an army in "Paris" to "Troyes"
    When End turn is given
    Then the order is applied first
    And then the marches run, and the economy and the levies run because a new month begins in the turn

  @TIME-014
  Scenario Outline: An order that can't be applied is rejected with a reason and the turn still runs
    Given the player has queued a move order that is invalid because "<cause>"
    When End turn is given
    Then the order is rejected with the reason "<reason>"
    And the reason appears in the turn report
    And the rest of the turn is processed

    Examples:
      | cause                                  | reason                            |
      | the army does not exist                | no such army                      |
      | the army belongs to another country    | not your army                     |
      | the destination is a sea zone          | armies need ships to cross water  |
      | no land route reaches the destination  | no road there over land           |

  @TIME-067
  Scenario: The player's orders come first, then each AI realm's by nation index
    Given the player is "France"
    And orders are queued in this order:
      | country  | order |
      | Castile  | 1     |
      | France   | 2     |
      | Burgundy | 3     |
      | France   | 4     |
      | Castile  | 5     |
    When End turn is given
    Then the orders are taken in the order 2, 4, then the AI realms' orders by ascending nation index, each realm's in the order given

  @TIME-015
  Scenario: An army takes one move order per turn
    Given the player has queued two move orders for the same army in one turn
    When End turn is given
    Then the first order is applied
    And the second is rejected with the reason "army already moved this turn"

  @TIME-016
  Scenario: Orders are frozen while the turn runs
    Given End turn has been given
    And the turn is being processed
    When the player tries to give an order
    Then the order is not accepted
    But the map can still be panned and zoomed

  @TIME-017
  Scenario: Unanswered events block End turn
    Given the event "Hungary offers a ten-year peace at Edirne" is unanswered
    When the player gives End turn
    Then the turn does not end
    And the first unanswered event opens
    And nothing answers the event for the player

  @TIME-018
  Scenario Outline: The End turn confirmation names open warnings but never blocks
    Given the End turn confirmation setting is "<setting>"
    And there are 3 open warnings and no unanswered events
    When the player gives End turn
    Then <outcome>

    Examples:
      | setting | outcome                                                                  |
      | on      | the game asks first and names "3 warnings wait for you", and the turn ends on "End turn anyway" |
      | off     | the turn ends at once                                                    |

  @TIME-019
  Scenario: A turn is presented as turn in progress, battles, events, then the report
    Given the player's army fights one battle this turn
    And two events fire this turn
    When End turn is given
    Then the turn in progress is shown first
    And the battle is shown when the turn reaches it
    And the events are shown one at a time in date order
    And the turn report is shown last

  @TIME-076 @feedback-7
  Scenario: The date ticks day by day after End turn
    Given the turn starts on 11 November 1444
    When the player ends the turn
    Then the shown date moves 12, 13, 14 November and on, one day at a time
    And during a player battle it moves in steps of 4 hours
    And it never jumps straight to 18 November
