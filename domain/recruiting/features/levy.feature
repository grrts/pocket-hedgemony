@context-recruiting
Feature: The levy
  As a player
  I want to call men up with one slider and see what it costs
  So that I can raise an army without managing classes by hand

  Background:
    Given the date is late summer 1444, 3 weeks before harvest
    And the country "France" holds 4 royal provinces in region "Champagne"
    And the region "Champagne" has about 260000 people and 65000 fighting-age men
    And the region "Champagne" has 7900 men who can be called, 65 percent of them farmers

  # Region levies are gone (RECR-104, playtest F-14). The rule this checks still holds per province; the region
  # wording stays until the province version has its own numbers.
  @RECR-008 @RECR-009 @RECR-038 @placeholder
  Scenario: The levy screen for Champagne
    When the player opens the levy screen for region "Champagne" and sets 5000 men
    Then the screen shows "Gold now" 100, "Food now" 2500, "Pay" free for 3 months then 750 gold a month
    And the screen shows "Harvest" -6 percent in "Champagne"
    And the screen shows "Pool left" 37 percent
    And the screen shows "Ready in" 2 weeks at "Troyes" as 5000 levies
    And the screen shows a harvest warning for the season
    And every cost line opens its gain and lose list

  # Region levies are gone (RECR-104, playtest F-14). The rule this checks still holds per province; the region
  # wording stays until the province version has its own numbers.
  @RECR-010 @RECR-011
  Scenario: A levy takes every class by its share
    When the country "France" levies 5000 men from region "Champagne"
    Then the levy takes by class:
      | class     | men  |
      | farmers   | 3250 |
      | herders   | 550  |
      | homeless  | 500  |
      | woodsmen  | 300  |
      | craftsmen | 200  |
      | seafolk   | 150  |
      | others    | 50   |
    And the levy takes 63 percent of each province's pool

  @RECR-012
  Scenario: A levy includes veterans by their share
    Given the province "Troyes" has 2000 recruits here, of whom 400 are veterans
    When the country "France" levies 1000 men from province "Troyes"
    Then 200 of the levied men are veterans

  @RECR-013 @RECR-106 @RECR-107 @feedback-15 @feedback-18 @placeholder
  Scenario: Levies gather a thousand at a time and wait for a commander
    When the country "France" levies 5000 men from province "Troyes"
    Then after 14 days the province "Troyes" has 1000 garrison troops of arm "levy foot"
    And the garrison troops can march and fight only once a commander picks them up

  @RECR-014 @RECR-106 @placeholder
  # config: gathering.railwayDays 3 (D-RECR-12)
  Scenario: Railway mobilization gathers levies in days
    Given the country "France" knows invention "W18 Railway mobilization"
    When the country "France" levies 5000 men from province "Troyes"
    Then each thousand gathers in 3 days instead of 14

  @RECR-103 @RECR-104 @RECR-107 @feedback-13 @feedback-14
  Scenario: A levy gathers in its own province
    When the country "France" levies 5000 men from province "Troyes"
    Then the levy gathers as garrison troops at "Troyes"
    And no army is formed until a commander picks them up

  @RECR-015 @RECR-016 @placeholder
  # config: levy money 20 gold per 1,000 men; gathering 1 ration a man a month
  Scenario Outline: Levy money and gathering food
    When the country "France" levies <men> men from region "Champagne"
    Then the country "France" pays <gold> gold up front
    And the levy eats <rations> rations from the local stores while gathering

    Examples:
      | men  | gold | rations |
      | 1000 | 20   | 500     |
      | 5000 | 100  | 2500    |

  @RECR-017 @placeholder
  # config: free months 3; levy pay 0.15 gold per man
  Scenario Outline: Levy pay starts in the 4th month
    Given the country "France" has 5000 levies that have served <months> months
    When the month is paid
    Then the country "France" pays <gold> gold for them

    Examples:
      | months | gold |
      | 1      | 0    |
      | 3      | 0    |
      | 4      | 750  |

  @RECR-018
  Scenario: Empty slots stop a building
    Given the province "Troyes" has a building whose slots are 60 percent filled
    When a levy takes men from its slots and leaves it 40 percent filled
    Then the building goes fallow and pays no tax and makes no wares

  @RECR-104 @RECR-105 @feedback-14 @feedback-18 @placeholder
  # config: recruiting.levy_unit 1000 (provisional)
  Scenario: The levy screen for Troyes
    When the player opens the levy screen from the province card of "Troyes"
    Then the men are chosen in whole thousands
    And the screen shows the thousands chosen as a percent of the men who can be called in "Troyes"
    And there is no levy for a region or the whole country

  @RECR-106 @feedback-18 @placeholder
  # config: recruiting.gather_days_per_thousand 14 (provisional)
  Scenario: Levies gather a thousand at a time
    When the country "France" levies 5000 men from province "Troyes"
    Then the first 1000 men are gathered after 14 days
    And all 5000 men are gathered after 70 days

  @RECR-107 @feedback-15 @feedback-17
  Scenario: Gathered levies wait as garrison troops
    Given the country "France" has gathered 2000 levies in "Troyes"
    Then they are garrison troops of "Troyes" on its Garrison tab
    And they cannot march, fight in the field or train until a commander picks them up
