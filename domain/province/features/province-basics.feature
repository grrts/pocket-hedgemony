@context-province
Feature: Province basics, storage and cadence
  As the game
  I want every province stat to be countable, explained, configurable and cheap to store
  So that the game is readable and runs on a phone

  @PROV-001 @PROV-004
  Scenario: Every stat is a count, never an abstract meter
    Given any province stat
    When the game works out the province's stats
    Then it is a count of tiles, buildings, workers, men, gold or days
    And no development, base tax, autonomy, core, unrest or devastation meter exists

  @PROV-002 @PROV-292
  Scenario: The province card explains every number
    Given the player opens the province "Troyes"
    Then the card shows its owner, governance, official, pretender, ground, tile row, people, classes, food, town, trade, tax, recruits, castle, faith, tongue, grievances and rebels
    When the player taps the "Tax" line
    Then its list of how it is gained and how it is lost is shown

  @PROV-003
  Scenario: Rates and limits live in one province config file
    Given the province config file
    When the game works out the province's stats
    Then it holds jobs per building, food per worker, the ground tables, slots per town size, toll effects and grievance thresholds
    And changing them needs no code change

  @PROV-290
  Scenario: Only stored stats are kept; the rest is worked out when needed
    Given a province's stored record
    When the game works out the province's stats
    Then it holds about 95 small numbers including up to 16 tiles and 11 class counts
    And food made, wares made, tax owed and reaching you, town size and country sums are worked out when needed

  @PROV-291
  Scenario: Update cadence
    Given the game advances one month
    When the game works out the province's stats
    Then births, deaths and overflow update
    And food updates each season
    And plague updates on days 7, 14, 21 and 28 while an outbreak runs
