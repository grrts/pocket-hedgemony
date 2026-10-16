@context-achievements
Feature: Store ids, upload files and offline sync
  As a player who often plays offline
  I want unlocks to reach every store when it can, under ids that never change
  So that no achievement is ever lost

  @ACH-051 @ACH-052
  Scenario: An offline unlock is kept and sent later
    Given the store is not reachable
    When the achievement "first_harvest" unlocks
    Then it is written to the profile at once
    And it is shown in the game at once
    And it waits in the unlock queue
    When the store becomes reachable
    Then the queued unlock is sent to the store

  @ACH-052
  Scenario: The queue retries at start-up
    Given the unlock queue holds "first_regiment"
    When the game starts and the store is reachable
    Then "first_regiment" is sent to the store

  @ACH-053
  Scenario: A new phone catches up on start-up
    Given the profile holds the unlocks "first_harvest" and "reach_1500"
    And the store on this device lists only "first_harvest"
    When the game starts
    Then "reach_1500" is sent to the store

  @ACH-059 @ACH-060 @ACH-061 @ACH-062
  Scenario Outline: Store ids are made from our id
    Given the achievement id "<id>"
    Then its id on "<store>" is "<store_id>"

    Examples:
      | id | store | store_id |
      | full_granaries | Steam | ACH_FULL_GRANARIES |
      | full_granaries | Game Center | com.pockethegemony.ach.full_granaries |
      | full_granaries | Google Play | the console's id, kept in achievements.google.json |

  @ACH-063
  Scenario: The build writes each store's upload file
    When the store lists are built from the YAML
    Then a Steam upload file, an App Store Connect list and a Google achievements CSV are written
    And each holds the localised names and texts

  @ACH-064
  Scenario: A retired achievement is hidden, never deleted
    Given the player has earned the achievement "first_year"
    When "first_year" is retired in an update
    Then it is hidden in every store and its test is turned off
    And the player keeps it
