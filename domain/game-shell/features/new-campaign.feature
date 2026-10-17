@context-game-shell
Feature: New campaign
  As a player
  I want to choose a realm on the map, set the options and begin
  So that a new campaign starts in three short steps

  Background:
    Given the main menu is shown
    And the player picks "New campaign"

  @SHELL-030
  Scenario: Three steps with a step strip
    Then the screen "new_campaign" shows the step strip "Realm · Options · Begin"
    And step 1 "Realm" is active
    When the player chooses the realm "France" and moves to step 2
    And the player presses Back
    Then step 1 "Realm" is active with the realm "France" still chosen

  @SHELL-031
  Scenario: Choosing a realm on the map
    Then the map is shown at world zoom
    And filters for region, difficulty, and free or locked are offered
    And a short list of suggested realms is shown
    When the player taps the realm "France"
    Then the card of "France" shows its strengths at a glance

  @SHELL-032 @SHELL-105
  Scenario: A locked realm leads to Unlock and back
    Given the game is the free tier
    When the player taps the realm "Castile"
    Then the card of "Castile" shows a padlock and a button to the screen "unlock"
    When the player buys the full game from the screen "unlock"
    Then step 1 "Realm" is shown with the realm "Castile" still chosen

  @SHELL-033
  Scenario: Options step
    Given the player has chosen the realm "Ottomans"
    When the player moves to step 2
    Then the options offered are difficulty, AI aggression, fog, historical or free events, ironman, and the end date
    And the end date can be 31 August of any year from 1494 to 1939, 31 August 1939 by default
    When the player picks a preset
    Then the preset fills the whole step

  @SHELL-034
  Scenario: Begin step
    Given the player has chosen the realm "France" and its options
    When the player moves to step 3
    Then a summary card shows the banner, ruler, capital, start date and options
    And one big "Begin" button is shown

  @SHELL-035
  Scenario Outline: Quick start
    Given the last options used were "<last options>"
    And <tapped>
    When the player presses "Quick start" on step 1
    Then step 3 "Begin" is shown with the realm "<realm>" and the options "<last options>"

    Examples:
      | last options       | tapped                                     | realm                  |
      | normal, ironman    | the player last tapped the realm "France"  | France                 |
      | normal, historical | the player has tapped no realm             | the first suggested realm |

  @SHELL-036
  Scenario: Back from step 1 leaves without asking
    When the player presses Back on step 1
    Then the main menu is shown
    And no confirmation was asked

  @SHELL-037
  Scenario: Nation select music
    Then the track "nation_select" plays
    When the player highlights the realm "Ottomans"
    Then the track's lead voice changes to the voice of the realm "Ottomans"
