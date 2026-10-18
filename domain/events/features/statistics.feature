@context-events
Feature: The event tree's statistics
  As the game
  I want stored values as state and derived values computed every tick
  So that events cannot desync derived numbers from their inputs

  @EVT-054
  Scenario: Events never write a derived statistic
    Given "food_security" is a derived province statistic
    When an event wants to lower food security in "area:bengal"
    Then it changes an input such as devastation or applies a modifier the formula reads
    And it does not write "food_security" directly

  @EVT-054
  Scenario: Derived values are recomputed every tick
    Given the province "Troyes" has its devastation raised by an event
    When the next tick runs
    Then its derived local supply and resource output are recomputed from the new devastation

  @EVT-055
  Scenario Outline: Units and ranges
    When the statistic "<stat>" is read
    Then its range is "<range>"

    Examples:
      | stat          | range      |
      | prosperity    | 1 to 60    |
      | unrest        | 0 to 100   |
      | stability     | -3 to +3   |
      | war_weariness | 0 to 20    |
      | prestige      | -100 to 100|
      | opinion       | -200 to 200|
      | trust         | 0 to 100   |

  @EVT-056
  Scenario Outline: Abstract stats land on concrete stats
    Given an event applies "<effect>" to the province "Troyes"
    When the effect lands
    Then <result>

    Examples:
      | effect             | result                                       |
      | prosperity +2      | two new buildings that fit the province      |
      | devastation +30    | 30 percent of its tiles are burned           |
      | unrest +20         | one named grievance from the event           |
      | fort_level +1      | its castle goes one step up                  |
      | infrastructure +1  | its road goes one step up                    |
      | industry +1        | one factory                                  |
      | disease_burden +40 | a plague outbreak                            |

  @EVT-056
  Scenario Outline: Notoriety and trust land in diplomacy
    Given the country "Italy" has no notoriety of its own in the event tree
    When an event applies "<effect>" to "Italy"
    Then the change is handed to diplomacy as <landing>
    And the event tree stores no "<stat>" for "Italy"

    Examples:
      | effect        | landing              | stat      |
      | notoriety +30 | a notorious deed     | notoriety |
      | trust -10     | an oath broken       | trust     |

  @EVT-056
  Scenario: integration_strain is only read
    When an event tries to change "integration_strain"
    Then the change is refused because events only read it
