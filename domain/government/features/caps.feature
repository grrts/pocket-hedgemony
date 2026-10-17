@context-government
Feature: Officials and lords caps
  As the game
  I want every country to have an officials cap and a lords cap built from its form and buildings
  So that a realm that hires too many officials or keeps too many lords pays in grievances and loyalty

  @GOV-001 @GOV-002 @GOV-049 @placeholder
  Scenario: France's caps in 1444
    # config keys: forms.feudal_realm, buildings.palace, buildings.seat, buildings.court_of_law
    Given the date is 1 January 1444
    And the country "France" has the form "Feudal realm"
    And the country "France" has a palace at step 2
    And the country "France" has 3 seats at step 1
    And the country "France" has a court of law
    And the country "France" has 18 officials and 11 lords
    When the caps are worked out
    Then the officials cap of "France" is 22, made of form 6, palace 10 and 3 seats 6
    And the lords cap of "France" is 14, made of form 8, palace 4 and court of law 2
    And the government card of "France" shows "Officials 18 of 22" and "Lords 11 of 14"
    And "France" is within both caps

  @GOV-001 @GOV-002 @placeholder
  Scenario: The Ottomans' caps in 1444
    # config keys: forms.household_realm, buildings.palace, buildings.chancery, buildings.seat, buildings.hostage_residence
    Given the date is 1 January 1444
    And the country "Ottomans" has the form "Household realm"
    And the country "Ottomans" has a palace at step 2, a chancery, 4 seats at step 1 and a hostage residence
    When the caps are worked out
    Then the officials cap of "Ottomans" is 32
    And the lords cap of "Ottomans" is 11

  @GOV-001 @GOV-002 @GOV-046 @placeholder
  Scenario: A one-province count
    Given the country "a one-province count" has the form "Feudal realm"
    And the country "a one-province count" has 1 province and a palace at step 1
    When the caps are worked out
    Then the officials cap of "a one-province count" is 12
    And the country "a one-province count" has no lords

  @GOV-003 @GOV-008 @placeholder
  Scenario Outline: Lord size only affects loyalty
    # config key: great_lord
    Given the country "France" has a lord "<lord>" holding <provinces> provinces
    When the caps and loyalty reasons are worked out
    Then the lord "<lord>" counts 1 toward the lords cap of "France"
    And the lord "<lord>" has <reasons> permanent "Great lord" reasons

    Examples:
      | lord     | provinces | reasons |
      | Bourbon  | 2         | 0       |
      | Brittany | 4         | 1       |
      | Brittany | 7         | 1       |
      | Burgundy | 8         | 2       |

  @GOV-004
  Scenario: Within both caps nothing happens
    Given the country "France" has 18 officials and an officials cap of 22
    And the country "France" has 11 lords and a lords cap of 14
    When the month ends
    And a New Year begins
    Then no province of "France" has the grievance "Grasping officials"
    And no lord of "France" loses a loyalty step for the lords cap

  @GOV-005 @placeholder
  Scenario: Officials over the cap get Grasping officials, newest hires first
    # config key: over_cap.officials.grievance
    Given the country "France" has an officials cap of 22
    And the country "France" has 24 officials
    And the two newest hires serve in "Troyes" and "Reims"
    When the caps are checked
    Then the province "Troyes" has the grievance "Grasping officials"
    And the province "Reims" has the grievance "Grasping officials"
    And no other province of "France" has the grievance "Grasping officials"

  @GOV-006
  Scenario: Grasping officials goes when back under the cap
    Given the country "France" has 24 officials and an officials cap of 22
    And the province "Troyes" has the grievance "Grasping officials"
    When the country "France" builds a chancery and its officials cap becomes 26
    Then the province "Troyes" no longer has the grievance "Grasping officials"

  @GOV-007 @placeholder
  Scenario: Lords over the cap slip at New Year
    # config keys: over_cap.lords.when, over_cap.lords.slips_per_lord_over, over_cap.lords.order
    Given the country "France" has a lords cap of 14
    And the country "France" has 16 lords
    And the lord "Armagnac" has the lowest loyalty
    And the lords "Burgundy" and "Brittany" share the next lowest loyalty, "Burgundy" holding more provinces
    When a New Year begins
    Then the lord "Armagnac" loses 1 loyalty step
    And the lord "Burgundy" loses 1 loyalty step
    And the lord "Brittany" loses no loyalty step

  @GOV-007
  Scenario: Lords over the cap do nothing until New Year
    Given the country "France" has 16 lords and a lords cap of 14
    And the date is 1 June 1450
    When the month ends
    Then no lord of "France" loses a loyalty step for the lords cap

  @GOV-009 @placeholder
  Scenario: A national strength adds to a cap
    Given the country "Venice" has the form "Merchant republic"
    And the country "Venice" has a national strength that adds 2 officials
    When the caps are worked out
    Then the officials cap of "Venice" includes 10 from the form and 2 from the strength

  @GOV-049
  Scenario: The government card lists the next forms and their needs
    Given the country "France" has the form "Feudal realm"
    And the country "France" has no diet hall, no G9 and no W12
    When the player opens the government card of "France"
    Then it shows "Diet monarchy: needs a diet hall" as not met
    And it shows "Absolute monarchy: needs G9, W12" as not met
    And it shows the subjects line as "x of y" from the subjects design
    And it offers the Reform action
