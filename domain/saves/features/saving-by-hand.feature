@context-saves
Feature: Saving by hand
  As a player
  I want to name, replace and delete my own saves without a keyboard
  So that saving is quick and nothing disappears by surprise

  Background:
    Given the campaign as "Castile" is loaded in May 1492 and is not ironman

  @SAVE-017
  Scenario: Save opens the campaign's slots
    Given the campaign has manual saves "Castile, March 1490" and "Castile, January 1491"
    When the player picks Save in the game menu
    Then "New save" is at the top
    And the existing manual saves are listed under it

  @SAVE-018
  Scenario: Default name needs no typing
    When the player picks "New save"
    Then the name is filled in as "Castile, May 1492"
    And the player can confirm it without typing

  @SAVE-019 @SAVE-003
  Scenario: Replacing writes a new file first
    Given the campaign has the manual save "Castile, March 1490" in the file "a.phsave"
    When the player picks "Castile, March 1490" to save over
    Then the question "Replace?" is shown
    When the player confirms
    Then a new file is written with a new name
    And only then the file "a.phsave" is removed
    And no existing file was changed

  @SAVE-020
  Scenario: At the slot limit Save asks
    Given the campaign has 20 manual saves
    When the player picks "New save"
    Then the player is asked which save to replace
    And no save is removed without the player's choice

  @SAVE-021
  Scenario: Deleting asks first
    When the player deletes "Castile, March 1490" from the Load screen
    Then a confirmation is shown
    And the save is removed only after the player confirms

  @SAVE-022
  Scenario: A small toast
    When a manual save is written
    Then the toast "Saved." is shown
    And no dialog is shown

  @SAVE-023
  Scenario: No space
    Given the device has no space left
    When the player saves
    Then the message "There isn't enough space on this device to save. Free some space, or delete old saves." is shown
    And no existing save is damaged
