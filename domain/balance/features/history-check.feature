@context-balance
Feature: The history check
  As Leroy, building the game
  I want AI-only campaigns compared with the history checkpoints
  So that I can see how far a campaign moves from history without the game ever pulling it back

  @BAL-031 @BAL-032 @BAL-033
  Scenario: The start matches its own checkpoint
    Given the bundled 1444 start
    When it is compared with the 11 November 1444 checkpoint
    Then more than 100 key places are counted
    And the checkpoint is within history

  @BAL-032
  Scenario: A place held under an alias matches
    Given the checkpoint names England as the holder of a place
    When Great Britain holds it
    Then the place matches

  @BAL-034
  Scenario: The command never fails on history
    Given a history run that reaches no checkpoint
    Then the report says no run reached a checkpoint
