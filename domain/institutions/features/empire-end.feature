@context-institutions
Feature: Faith settlements and the end of the Empire
  As the game
  I want the Empire to change with the great wars of faith and to end when it is hollow
  So that history can follow its course or go another way

  @INST-050
  Scenario: An eighth seat after Westphalia
    Given "Bavaria" is the largest member without a seat
    When the event "peace_of_westphalia" fires
    Then "Bavaria" holds an eighth seat

  @INST-033
  Scenario: Faith no longer costs hold after Westphalia
    Given the event "peace_of_westphalia" has fired
    And "Saxony" is Protestant and the Emperor is Catholic
    When January begins
    Then the hold record has no loss for the faith of "Saxony"

  @INST-051 @placeholder
  Scenario: Dissolved when hollow
    # config: empire.dissolve_years_at_zero
    Given the Empire's hold has stood at 0 for 5 years in a row
    When January begins
    Then the Empire is dissolved
    And every former member is a free realm

  @INST-051
  Scenario: Dissolved by a peace term
    Given it is era IV
    And "France", not a member, has won a war against the Emperor
    When "France" takes the peace term "Dissolve the Empire"
    Then the Empire is dissolved
    And no realm holds the war aim "Restore imperial land"
