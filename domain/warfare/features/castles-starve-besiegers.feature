@context-warfare
Feature: Castles starve besiegers
  As a small realm under attack
  I want my castles to gather the land's food in behind their walls
  So that an invader living off my land goes hungry sooner and I can hold out longer

  # Leroy, 19 Oct (F-164). Config keys: warfare.castle_supply.forage_cut_by_step,
  # warfare.castle_supply.reach_share, warfare.castle_supply.besieger_eat_by_step (all provisional).

  @WAR-263 @placeholder
  Scenario Outline: Foragers find less in a castle's province
    Given the country "Castile" is at war with the country "Portugal"
    And a Castilian army forages in a Portuguese province with food
    When Portugal holds a castle of step <step> in that province
    Then the Castilian foragers find <cut> % less there

    Examples:
      | step | cut |
      | 1    | 30  |
      | 2    | 45  |
      | 3    | 60  |
      | 4    | 70  |
      | 5    | 80  |

  @WAR-264 @placeholder
  Scenario: Foragers find less in the land a castle reaches
    Given the country "Castile" is at war with the country "Portugal"
    And a Castilian army forages in a Portuguese province with food
    When Portugal holds a castle of step 2 in the neighbouring Portuguese province
    Then the Castilian foragers find 22.5 % less there

  @WAR-264
  Scenario: A castle the enemy holds gathers nothing in
    Given the country "Castile" is at war with the country "Portugal"
    And a Castilian army forages in a Portuguese province with food
    When Portugal holds a castle of step 2 in that province
    And Castile occupies that province
    Then the Castilian foragers find 0 % less there

  @WAR-263
  Scenario: The owner's and other realms' armies forage as before
    Given the country "Castile" is at war with the country "Portugal"
    And a Castilian army forages in a Portuguese province with food
    And a Portuguese army and an army of a realm at peace with Portugal stand in that province
    When Portugal holds a castle of step 2 in that province
    Then the Portuguese army and the army at peace find as much as without the castle

  @WAR-265 @placeholder
  Scenario: Besiegers eat more
    Given the country "Castile" is at war with the country "Portugal"
    And a Castilian army besieges a Portuguese stone castle
    Then the besiegers eat 1.25 times their rations
    And a Castilian army of the same size on open Portuguese land eats 1 times its rations

  @WAR-266 @WAR-268 @WAR-269
  Scenario: The army's food line says why
    Given the country "Castile" is at war with the country "Portugal"
    And a Castilian army besieges a Portuguese stone castle
    When the player opens the army's commander screen
    Then its food line says "foragers find 45 % less: Setúbal's castle has gathered the food in"
    And it says "besieging: men eat 25 % more from camp fevers and sallies"
    And its months of food count the extra eating

  @WAR-267 @WAR-268 @WAR-269
  Scenario: The castle says what it keeps from foragers
    Given the player's country "Portugal" can build a stone castle in a province
    When the player opens that province's build sheet
    Then the castle row says enemy foragers find 45 % less there and 23 % less in the land it reaches
    And it says besiegers eat 25 % more
