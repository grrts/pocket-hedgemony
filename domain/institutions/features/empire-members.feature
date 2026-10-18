@context-institutions
Feature: Members of the Empire
  As a realm in the heart of Europe
  I want to know who belongs to the Empire and how that changes
  So that I know whom the Emperor defends

  @INST-010 @placeholder
  Scenario: The Empire in 1444
    # config: empire.hold_start
    Given a new campaign starts on 11 November 1444
    Then "Austria" holds the office of Emperor
    And "Saxony", "Brandenburg", "Bohemia", "Cologne" and "Palatinate" are members of the Empire
    And the Empire's hold is 35

  @INST-011
  Scenario: Imperial land does not move with conquest
    Given "Hesse" held the province "Northeast Hessen" on 1 January 1444
    When "Burgundy" takes "Northeast Hessen" in a peace
    Then "Northeast Hessen" is still imperial land
    And it is imperial land held by a non-member

  @INST-012
  Scenario: A member that becomes an outsider's subject leaves
    Given "Lorraine" is a member of the Empire
    When "Lorraine" becomes a Vassal of "France"
    Then "Lorraine" is no longer a member of the Empire

  @INST-012
  Scenario: A realm with its capital in imperial land joins
    Given the "Teutonic Order" has its capital in imperial land and is not a member
    When the Emperor asks it to join and its reasons count is over zero
    Then the "Teutonic Order" is a member of the Empire
