@context-recruiting
Feature: Champagne, late summer 1444
  # Worked example from the recruiting design, drawn as a region levy. Since the playtest feedback (F-14, F-18)
  # a levy is raised one province at a time, by the thousand; the example's sums still hold per province.
  As a player of France
  I want the worked example of the recruiting design to come out as written
  So that the levy, training, food, pay and command rules fit together

  Background:
    Given the date is late summer 1444, 3 weeks before harvest
    And the country "France" is at war with the country "Burgundy"
    And the region "Champagne" has 4 royal provinces of "France" with about 260000 people
    And the region "Champagne" has 65000 fighting-age men and 7900 men who can be called
    And the province "Troyes" has a stone castle

  @RECR-010 @RECR-015 @RECR-016 @RECR-023 @RECR-034 @placeholder
  Scenario: The levy of 5000
    When the country "France" levies 5000 men from region "Champagne"
    Then the levy costs 100 gold and 2500 rations
    And the harvest in "Champagne" falls by 6 percent
    And each province keeps 37 percent of its pool
    And no province gets the grievance "Conscription"

  @RECR-023 @placeholder
  Scenario: A levy of 6000 would bring Conscription
    When the country "France" levies 6000 men from region "Champagne"
    Then each province keeps 24 percent of its pool
    And all four provinces get the grievance "Conscription"

  @RECR-040 @RECR-045 @RECR-031 @RECR-054 @placeholder
  Scenario: Training pikes and light horse
    Given the country "France" has 5000 levies from region "Champagne"
    When 2500 train into "pikes" at the castle of "Troyes"
    And 500 train into "light horse" at "Reims"
    And the other 2000 march at once as levies
    Then the pikes cost 150 gold and 25 loads of arms and eat 11250 rations in 3 months
    And the light horse cost 50 gold and 500 horses and eat 6750 rations in 3 months
    And training eats 18000 rations from the castle stores at "Troyes" and "Reims"
    And no pay is owed during training

  @RECR-033 @RECR-017 @RECR-051 @placeholder
  Scenario: Six months on campaign
    Given the army has 2500 pikes, 500 light horse and 2000 levies
    When it fills a 2-month reserve
    Then the reserve takes 23000 rations
    And from the 4th month it costs 1000 gold a month in pay
    And it eats 11500 rations a month on campaign
    And its real food cost against home is about 6500 rations a month

  @RECR-071 @RECR-085 @placeholder
  Scenario: The steward of Reims takes command
    Given the official of province "Reims" is a steward with 8 years served
    And the province "Reims" has at least 20 clerks
    When the steward is commissioned as commander and a deputy is named for "Reims"
    Then the commander has Might 0, Cunning 1 and Logistics 4 and trait "Careful"
    And the deputy costs 1 gold a month
    And the army eats 20 percent less

  @RECR-092
  Scenario: The lords answer
    Given the lord "Count of Foix" is Proud and the lord "Duke of Bourbon" is not
    When the lords are called to the steward's army
    Then the lord "Count of Foix" refuses to bring his retinue
    And the lord "Duke of Bourbon" comes

  @RECR-087 @RECR-026 @RECR-028
  Scenario: After the war
    Given the army wins twice and comes home in spring
    And 700 of the 5000 died
    When the steward is released to "Reims"
    Then the steward returns to full effect at once because a deputy kept the seat
    And the births of "Troyes" dip for a decade from its fallen
    And 1400 veterans return to "Troyes" and will train in half the time
