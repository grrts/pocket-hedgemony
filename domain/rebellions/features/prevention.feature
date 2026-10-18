@context-rebellions
Feature: Preventing risings
  As a player
  I want levers that keep provinces from rising
  So that I can fix the cause instead of fighting the rebels

  @REBL-051
  Scenario: Ending a grievance prevents a rising
    Given the province "Troyes" has 4 grievances including "Hungry"
    When the local store of "Troyes" stays above 3 months for a full season
    Then the province "Troyes" no longer has the grievance "Hungry"
    And the province "Troyes" is at the step "riots"

  @REBL-052
  Scenario Outline: A judge raises the bar by one grievance
    Given a judge runs the province "Troyes"
    And the province "Troyes" has <grievances> grievances
    When the month is processed
    Then the province "Troyes" is at the step "<step>"

    Examples:
      | grievances | step      |
      | 3          | grumbling |
      | 4          | riots     |
      | 5          | plotting  |

  @REBL-053
  Scenario: An almshouse stops the homeless counting toward the trouble
    Given the province "Troyes" has 25 percent homeless
    And an almshouse shelters the homeless of "Troyes"
    When the month is processed
    Then the homeless of "Troyes" do not count toward its grievances

  @REBL-054
  Scenario: A garrisoned castle on the main road limits spread and forces a siege
    Given a rising holds the province "Troyes"
    And a garrisoned castle stands on the main road from "Troyes" to "Sens"
    When the spread roll for "Sens" is made
    Then the chance to spread to "Sens" is lower
    And the rebels must besiege the castle to pass

  @REBL-055
  Scenario: Loyal lords do not join and fight for you
    Given a rising holds the province "Troyes"
    And the lord "Count of Armagnac" is "Loyal"
    When the month is processed
    Then "Count of Armagnac" does not join the rising
    And his retinue fights for the owner
