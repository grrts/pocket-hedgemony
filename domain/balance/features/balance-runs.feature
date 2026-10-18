@context-balance
Feature: Balance runs
  As the game's developers
  I want the real 1444 world played headless by the AI, many times
  So that we can see how the systems work together without playing by hand

  # Config keys: balance.years, balance.seeds

  @BAL-001 @BAL-002 @placeholder
  Scenario: A headless run plays the real 1444 world
    Given a balance run with seed 1 and the probe realm "France" played by the strategy "Court"
    When the run is played for 50 years
    Then every realm but "France" was played by the AI
    And no realm was the player's
    And the run began on 11 November 1444 on the real map
    And the last metrics row is for January 1494

  @BAL-003 @placeholder
  Scenario: Strategies are compared on the same worlds
    Given a run set with 8 seeds, the probe realm "Castile" and the strategies "Conqueror" and "Builder"
    When the run set is played
    Then "Conqueror" and "Builder" were each played on the same 8 seeds

  @BAL-004 @BAL-005
  Scenario: Same seed, same metrics
    Given a balance run with seed 7 and the probe realm "Mali" played by the strategy "Diplomat"
    When the run is played twice
    Then both runs record the same metrics in every row
    And the rules data was not changed by either run

  @BAL-006
  Scenario: A broken run is recorded and the rest go on
    Given a run set of 4 runs in which the run with seed 3 throws an error in its 12th year
    When the run set is played
    Then the run with seed 3 is recorded as failed with its turn, seed and error
    And the other 3 runs are played to the end
    And the run set is marked failed
