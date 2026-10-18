@context-buildings
Feature: Event effects on buildings
  As the event tree
  I want effects and a condition that act on buildings
  So that events can found, damage and test buildings

  @BLD-139
  Scenario Outline: add_building
    Given the province "Troyes" <has_room> a fitting empty place for a "market"
    When an event applies "add_building" with type "market", step 1, owner "the crown"
    Then <result>

    Examples:
      | has_room | result                                                         |
      | has      | a step 1 market owned by the crown stands on the empty place   |
      | lacks    | the province's least-filled building goes up a step            |

  @BLD-140
  Scenario: remove_building
    Given the province "Troyes" has a market
    When an event applies "remove_building" with type "market"
    Then the market is ruined

  @BLD-141
  Scenario: damage_buildings
    Given the province "Lisbon" has 10 buildings
    When an event applies "damage_buildings" with share 0.3
    Then 3 buildings are damaged

  @BLD-142
  Scenario Outline: building_step
    Given the province "Troyes" has a market at step 2
    When an event applies "building_step" with type "market" and change <change>
    Then the market is at step <step>

    Examples:
      | change | step |
      | +1     | 3    |
      | -1     | 1    |

  @BLD-143
  Scenario: has_building
    Given the province "Troyes" has a market at step 2
    When the building rules are applied
    Then the condition "has_building" with type "market" and step 2 holds
    And the condition "has_building" with type "market" and step 3 does not hold

  @BLD-144
  Scenario Outline: Old province stats map to buildings
    Given the buildings config of the design
    When an event applies "<effect>" to "Troyes"
    Then <result>

    Examples:
      | effect             | result                         |
      | prosperity +2      | two fitting buildings are added |
      | fort_level +1      | the castle goes up a step      |
      | infrastructure +1  | the road goes up a step        |
      | industry +1        | a factory is added             |
