@context-troop-movement
Feature: Dunois marches to Dijon, March 1450
  As a player of France
  I want the worked example of the troop movement design to come out as written
  So that step days, castles, food colours and contact fit together

  Background:
    Given the date is March 1450
    And the country "France" is at war with the country "Burgundy"
    And "Jean de Dunois" with Cunning 4 leads 14200 men with 3200 horse and 8 bombards in "Paris"
    And "Paris" and "Troyes" are French farmland, "Langres" is Burgundian hills, "Dijon" is Burgundian farmland
    And "Troyes" is on the Seine with no bridge

  @MOVE-011 @MOVE-018 @MOVE-021 @MOVE-022 @MOVE-024 @placeholder
  Scenario Outline: Step days on the way to Dijon
    When the step from "<from>" to "<to>" is planned
    Then the step takes <days> days

    Examples:
      | from    | to      | days |
      | Paris   | Troyes  | 6.5  |
      | Troyes  | Langres | 7.0  |
      | Langres | Dijon   | 5.6  |

  @MOVE-047 @MOVE-068 @open-question
  # OQ-MOVE-19: 6.5 + 7.0 = 13.5 days shown as day 14
  Scenario: The planner ends the route at Langres
    Given "Langres" has a stone castle with 400 garrison
    And every other road to "Dijon" runs through Burgundian castles
    When Leroy drags the army's banner to "Dijon"
    Then the route ends at "Langres" with "stops at Langres on day 14 until the castle falls"
    And the leg to "Dijon" stays drawn in grey
    And the food line is green to "Troyes" and yellow at "Langres"

  @MOVE-043 @MOVE-082
  Scenario: Dunois besieges Langres
    When the month is played
    Then Dunois arrives at "Langres" on day 14 and besieges it

  @MOVE-055 @MOVE-057 @MOVE-005 @MOVE-098
  Scenario: The Bastard of Burgundy can't slip away
    Given "the Bastard of Burgundy" with Cunning 2 leads 8000 men seen by France as a rumour of "about 6000 near Beaune"
    And his standing order is "retreat if outnumbered" 3 to 2
    When his army marches north and stands in "Langres" at the end of day 22
    Then he wants to withdraw because 14200 against 8000 is more than 3 to 2
    But he must fight because his Cunning is lower than Dunois'
    And the garrison of "Langres" joins him from the walls
    And Leroy gets one notice "Battle at Langres"

  @MOVE-041 @MOVE-044
  Scenario: Resuming after the castle falls
    Given Dunois wins and the castle of "Langres" falls
    When Leroy taps the grey leg
    Then the march to "Dijon" resumes
