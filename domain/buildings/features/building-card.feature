@context-buildings
Feature: Building card
  As a player
  I want to see every field of a building and why it makes what it makes
  So that I can always tell why it makes less this year

  @BLD-001 @BLD-004
  Scenario: The building card shows every field and the next step
    Given the province "Troyes" has a step 1 "loom house" in town slot 3 owned by "the crown"
    And the "loom house" has 1500 craftsmen slots, all filled
    When the player taps the "loom house" on the tile row
    Then the card shows type, place, step, owner, jobs, makes, needs, condition and upkeep
    And each field has its gain and lose list
    And the card shows the next step "draper's hall" with "+900 jobs" for 80 gold, 20 bricks and 8 months
    And the card offers the actions "Upgrade", "Demolish" and "Close"

  @BLD-002
  Scenario Outline: Empty job slots make nothing
    Given the province "Troyes" has a step 1 "loom house" with 1500 craftsmen slots
    And <filled> of its slots are filled
    When the year's wares are made
    Then only the filled slots make cloth
    And a "loom house" with 0 filled slots makes nothing

    Examples:
      | filled |
      | 1500   |
      | 750    |
      | 0      |

  @BLD-005
  Scenario: A building gives no flat percentage to the country
    Given the country "France" has a step 1 "market" in "Troyes"
    When the effects of the "market" are applied
    Then the "market" gives job slots, wares and its named local effect
    And it gives no flat percentage to any country stat
