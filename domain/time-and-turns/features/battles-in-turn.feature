@context-time-and-turns
Feature: Battles inside the turn
  As a player
  I want my battles fought over time while the week goes on
  So that I can follow them, send help and retreat when it goes badly

  @TIME-027 @TIME-031
  Scenario: Battles are fought in the order they begin
    Given battles happen on day 9 in "Langres" and on day 22 in "Langres"
    When the turn is played out
    Then the battle of day 9 is resolved before the battle of day 22
    And each result is ready before it is shown

  @TIME-028
  Scenario: A player battle slows the day to six 4-hour steps
    Given the player's army under "Jean de Dunois" stands in "Langres"
    And the army of "the Bastard of Burgundy" reaches "Langres" on day 22
    When the turn is played
    Then the battle in "Langres" begins on day 22
    And while it runs each day is played in 6 steps of 4 hours
    And the turns do not stop and play on to their last day

  @TIME-028
  Scenario: Other armies keep marching during a player battle and can join it
    Given the player's army under "Jean de Dunois" stands in "Langres"
    And the army of "the Bastard of Burgundy" reaches "Langres" on day 22
    And the player's army under "La Hire" reaches "Langres" on day 23
    When the turn is played
    Then "La Hire" joins the battle in "Langres" on day 23

  @TIME-028
  Scenario: Standing orders changed during the battle are the ones fought with
    Given the player's battle in "Langres" is running
    When the player sets the standing orders "hold the ford"
    Then the battle's later rounds are fought with the standing orders "hold the ford"

  @TIME-028
  Scenario: The player can retreat at any step and there is no skip
    Given the player's battle in "Langres" is running
    When the player orders a retreat at the 3rd step
    Then the battle ends at that step with a retreat
    And the controls offer only "change standing orders", "retreat" and "switch battle"

  @TIME-073
  Scenario: The player switches between running battles
    Given the player's battles in "Langres" and "Troyes" are running
    When the player switches to the battle in "Troyes"
    Then the battle in "Troyes" is followed
    And both battles keep fighting a round each step

  @TIME-029
  Scenario: Battles between other realms never slow the game
    Given the countries "Castile" and "Navarre" fight a battle on day 5
    And the player is "France"
    When the turn is played out
    Then no day is split into 4-hour steps
    And the battle fights 6 rounds each day, as long as a player battle would

  @TIME-066
  Scenario: Any battle can be replayed from its notice
    Given the countries "Castile" and "Navarre" fight a battle on day 5
    And the player is "France"
    When the turn is played out
    Then the battle can be replayed from its notice with the same result

  @TIME-071 @placeholder
  Scenario: The turn plays back slower while a player battle runs
    Given the config value "playback.secondsPer10Days" is 1
    And the config value "playback.secondsPerBattleStep" is 0.5
    Then 10 whole days play back in 1 second
    And a day split into 6 steps plays back in 3 seconds

  @TIME-030 @TIME-034
  Scenario: A turn killed during a battle replays to the same result
    Given the player's army under "Jean de Dunois" stands in "Langres"
    And the army of "the Bastard of Burgundy" reaches "Langres" on day 22
    And the app was killed while the battle ran
    When the campaign is resumed from the pre-turn save with the same orders
    Then the battle in "Langres" begins on day 22 again
    And the battle has the same result

  @TIME-075
  Scenario: The game shell can play a turn one step at a time
    Given the player's battle in "Langres" is running
    When the next turn is begun step by step
    Then each step plays one 4-hour step of the day while the battle runs
    And nothing more is played until the next step is asked for
    And the turn is done after its 7 days and the weekly steps
