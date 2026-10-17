@context-troop-movement
Feature: A turn played out in days
  As the game
  I want every army to take its day step at the same time, every day of the turn
  So that armies meet on the road, castles stop columns on a given day and fast armies catch slow ones

  @MOVE-002
  Scenario: The order of a day
    When a day of the month is played
    Then the steps run in this order:
      | step            |
      | move            |
      | stop checks     |
      | contact         |
      | standing orders |

  @MOVE-003
  Scenario Outline: An army arrives when it has walked enough days
    Given the army "A" walks a step of <step> days from "Paris" to "Troyes"
    And the army "A" has walked <walked> days of it
    When one more day is played
    Then the army "A" stands in "<place>"

    Examples:
      | step | walked | place  |
      | 6    | 4      | Paris  |
      | 6    | 5      | Troyes |
      | 6.5  | 5      | Paris  |
      | 6.5  | 6      | Troyes |

  @MOVE-004
  Scenario: Arriving runs the stop checks
    Given the army "A" is one day from "Langres"
    When the army "A" arrives in "Langres"
    Then the stop checks run for "Langres"

  @MOVE-005
  Scenario: Hostile armies in one province start the battle rules
    Given the country "France" is at war with the country "Burgundy"
    When the French army "A" and the Burgundian army "B" stand in "Langres" at the end of day 22
    Then the battle rules start in "Langres" on day 22

  @MOVE-006
  Scenario: Armies in battle don't move
    Given the army "A" is in a battle that lasts 3 days
    When those 3 days are played
    Then the army "A" adds no days to its step

  @MOVE-007
  Scenario: Food runs weekly; sieges, sickness and pay monthly
    When the weekly turns of a whole month are played
    Then army food, hunger, plunder and raids run at the end of each 7-day turn, on days 7, 14, 21 and 28
    And sieges, sickness and pay run once, in the turn in which the month begins

  @MOVE-001
  Scenario Outline: A month has its real length
    Given the date is <month> <year>
    When the weekly turns of a whole month are played
    Then the day loop runs <days> days

    Examples:
      | month    | year | days |
      | February | 1451 | 28   |
      | February | 1452 | 29   |
      | February | 1700 | 28   |
      | April    | 1451 | 30   |
      | March    | 1451 | 31   |

  # config: battleSteps (X-1: six 4-hour steps a day while a player battle runs)
  @MOVE-118 @placeholder
  Scenario: A player battle slows the day to 4-hour steps and others march in
    Given the player's army "A" of "France" and the enemy army "B" fight in "Langres" in a battle of 12 rounds from day 1
    And the French army "C" has 0.5 days left on its step into "Langres" after day 1
    When days 1 to 3 are played
    Then days 1 and 2 are played in six 4-hour steps and day 3 is not
    And the army "C" joins the battle in "Langres" on day 2 at step 3
    And the battle in "Langres" ends on day 2 after 12 rounds

  @MOVE-118
  Scenario: The player orders a retreat at any step
    Given the player's army "A" of "France" and the enemy army "B" fight in "Langres" in a battle of 12 rounds from day 1
    And the player orders "A" to retreat on day 1 at step 4
    When days 1 to 2 are played
    Then "A" withdraws from "Langres" on day 1 at step 4
    And the battle in "Langres" ends on day 1 after 3 rounds

  @MOVE-119
  Scenario: AI battles never slow the turn and are joined at the start of a day
    Given the AI armies "C" of "Burgundy" and "D" of "Savoy" fight in "Dijon" in a battle of 12 rounds from day 1
    And the Burgundian army "E" has 0.5 days left on its step into "Dijon" after day 1
    When days 1 to 3 are played
    Then no day is played in 4-hour steps
    And the army "E" joins the battle in "Dijon" at the start of day 2
    And the battle in "Dijon" ends on day 2 after 12 rounds

  @MOVE-111
  Scenario: Movers take their day step in a fixed order
    Given the trader "T1", the fleet "F1" and the armies "B" and "A" are on the move
    When a day of the month is played
    Then they step in the order "A", "B", "F1", "T1"

  @MOVE-008
  Scenario: An army stands where it left until it arrives
    Given the army "A" is walking from "Troyes" to "Langres" with 3 days left
    Then the army "A" stands in "Troyes"
    And it eats, is seen and can be attacked in "Troyes"

  @MOVE-009
  Scenario Outline: Meeting halfway on a border
    Given the country "France" is at war with the country "Burgundy"
    And the French army "A" walks from "Troyes" to "Langres" with <a_left> days left
    And the Burgundian army "B" walks from "Langres" to "Troyes" with <b_left> days left
    When they meet on the border
    Then the battle is fought in "<place>"

    Examples:
      | a_left | b_left | place   |
      | 5      | 2      | Troyes  |
      | 2      | 5      | Langres |

  @MOVE-010
  Scenario: Progress carries into the next turn
    Given the army "A" starts a mountain step of 9 days on day 3 of a turn
    When the next turn is played
    Then the army "A" arrives on day 5 of the next turn

  @MOVE-001
  Scenario: A turn is one week
    Given the date is 29 March 1451
    When the next turn is played
    Then the day loop runs 7 days
    And the weekly steps run once, at the end of the turn
    And the monthly steps run, because April begins in this turn
    And the next turn starts on 5 April 1451
