@context-rebellions
Feature: How other systems see rebellions
  As the game
  I want the country card, lords, events, the AI and envoys to read rebellions
  So that a rising matters beyond its province

  @REBL-059
  Scenario: In revolt counts provinces with riots or rebels
    Given the country "France" has 2 provinces in riots and 1 province held by rebels
    When the country card of "France" is shown
    Then "In revolt" shows 3

  @REBL-060
  Scenario: A lord at In revolt is a lord's revolt
    Given the lord "Duke Philip of Burgundy" reaches the loyalty "In revolt"
    When the month is processed
    Then a lord's revolt led by "Duke Philip of Burgundy" holds his lands

  @REBL-061
  Scenario: An event's unrest lands as a named grievance
    Given an event applies "unrest +20" to the province "Troyes"
    When the effect is applied
    Then the province "Troyes" gets one named grievance from the event

  @REBL-062
  Scenario: A rival paying your rebels is a hostile act you can find out about
    Given the country "England" pays the rebels in the province "Troyes" of "France"
    When an envoy of "France" finds out
    Then "France" knows "England" paid its rebels as a hostile act

  @REBL-063
  Scenario: The rebellion card (Troyes weavers' rising)
    Given a tax rising holds Troyes town but not the castle
    And its leader is "Jehan the Dyer" with Cunning 3
    And craftsmen, homeless and some farmers have joined
    And it has 3400 men carrying "Old weapons"
    And it has food for 2 months
    And 2 neighbouring provinces share the grievance
    And nobody backs it
    When the player opens the rebellion card
    Then the card shows the cause "Heavy taxes" and the demand "tax back to normal"
    And the card shows "Men 3,400" and "Arms: tools and old weapons (x0.6)"
    And the card shows "Holds Troyes town (not the castle)" and "Food: 2 months"
    And the card shows "Severity Rising · 1 province · 2 neighbours share the grievance"
    And the card shows "Backed by nobody yet" and where it may spread next month
    And the card offers "Grant demand", "Talk", "Bribe leader", "Wait" and "Attack"
