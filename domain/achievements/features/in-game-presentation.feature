@context-achievements
Feature: Achievements in the game
  As a player
  I want to see when I earn an achievement and what is still within reach
  So that the goals can shape my campaign

  @ACH-069
  Scenario: A toast shows the unlock
    Given the "Achievement toasts" setting is on
    When the achievement "first_harvest" unlocks on the map
    Then a toast slides in at the top for 3 seconds
    And it shows the icon, the name "First Harvest" and the tier "copper"
    And a short chip-tune sting plays

  @ACH-070
  Scenario Outline: The toast waits for a battle or event screen to close
    Given the "<screen>" screen is open
    When an achievement unlocks
    Then the toast waits until the "<screen>" screen closes

    Examples:
      | screen |
      | battle |
      | event |

  @ACH-071
  Scenario: Toasts can be turned off
    Given the "Achievement toasts" setting is off
    When the achievement "first_harvest" unlocks
    Then no toast is shown
    And the achievement is unlocked

  # Where the screen opens is placed by the screen flow (OQ-ACH-13).
  @ACH-072 @open-question
  Scenario: The achievements screen
    When the player opens the achievements screen from the pause menu
    Then the screen shows a grid of icons grouped by category
    When the player selects "Counting House"
    Then its text, its progress and the date it was earned are shown

  @ACH-073
  Scenario: The "earnable in this campaign" filter leaves out what can no longer be earned
    Given the date is 1520-03-01
    And the achievement "first_harvest" is already earned
    When the player turns on the "earnable in this campaign" filter
    Then "first_harvest" is not shown
    And "printing_early" is not shown, because 1470 has passed
    And "reach_1700" is shown

  @ACH-074
  Scenario: The turn report gets a line with a jump
    When the achievement "castle_by_storm" unlocks at the castle of "Troyes"
    Then the turn report has one line for it
    And the line jumps to the castle of "Troyes"
