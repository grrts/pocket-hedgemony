@context-warfare
Feature: Battle length: a contact day, bells by daylight, losses bell by bell
  As a player
  I want a battle to take days, as it did, from the armies meeting to the rout
  So that I can follow it, march in help or pull out, and its losses feel right

  # Config keys: warfare.battle.contact_days, warfare.battle.first_bell_hour, warfare.battle.bells_per_day,
  # warfare.battle.max_days, warfare.hits_per_bell, warfare.after.pursuit
  # F-158 (Leroy, 19 Oct): battles passed in under a day and armies broke too fast.

  Background:
    Given Castile's army of 12000 men meets Portugal's army of 6000 men in a Castilian province

  @WAR-234 @placeholder
  Scenario: A contact day before the first bell
    When the battle's first day passes
    Then nobody on either side has been lost
    And the battle is in contact until the next morning's first bell at 8 o'clock

  @WAR-233 @WAR-090 @placeholder
  Scenario: Bells only by daylight
    When the battle is fought to its end
    Then every bell was fought between 8 and 20 o'clock
    And no more than 3 bells were fought on any day
    And the battle lasted more than 2 days from contact to its end

  @WAR-235 @placeholder
  Scenario: Losses and morale bell by bell
    When the battle is fought to its end
    Then the losses were dealt over more than one bell
    And the beaten side's morale fell bell by bell

  @WAR-236 @WAR-127 @placeholder
  Scenario: The pursuit after a rout
    When the battle is fought to its end
    Then the beaten side lost a larger share of its men than the winner

  @WAR-237 @WAR-238 @WAR-239
  Scenario: The phase in the battle viewer
    When the battle is fought to its end
    Then the battle's phase went from "contact" to "fighting" and "night", and back to "fighting"
