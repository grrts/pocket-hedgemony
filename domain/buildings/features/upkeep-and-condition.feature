@context-buildings
Feature: Upkeep and condition
  As a realm
  I want buildings to cost upkeep and decay when unpaid
  So that overbuilding in a good century has a price in a bad one

  @BLD-052 @placeholder
  Scenario: Upkeep is paid a twelfth each month
    Given the province "Troyes" has a loom house with upkeep 1 gold a year owned by "the crown"
    When a month passes
    Then the crown pays 1/12 gold for the loom house

  @BLD-053 @placeholder
  Scenario Outline: Upkeep by group
    Given the buildings config of the design
    When the building rules are applied
    Then a "<building>" has a yearly upkeep between <low> and <high> gold

    Examples:
      | building       | low | high |
      | farm           | 0   | 0.5  |
      | quarry         | 0.5 | 2    |
      | market         | 0.5 | 2    |
      | school         | 2   | 6    |
      | castle         | 3   | 20   |
      | palace         | 5   | 30   |

  @BLD-054
  Scenario: The clergy pay for houses of worship
    Given the province "Troyes" has a church owned by "the clergy"
    When a month passes
    Then the clergy pay the church's upkeep
    But when the crown takes over its upkeep the crown pays it

  @BLD-055
  Scenario: The Treasury card sums upkeep
    Given the country "France" has buildings with a total upkeep of 84 gold a year
    When the building rules are applied
    Then the Treasury card's Upkeep line includes 84 gold a year for buildings

  @BLD-056 @BLD-057 @BLD-058 @placeholder
  Scenario Outline: Neglect and recovery
    Given the province "Rouen" has a sound market
    When <event>
    Then the market is <condition> and works at <output>

    Examples:
      | event                                                      | condition | output |
      | its upkeep goes unpaid in a month                          | neglected | half   |
      | its upkeep is then paid for 2 months                       | neglected | half   |
      | its upkeep is then paid for a full season of 3 months      | sound     | full   |

  @BLD-059 @BLD-060 @placeholder
  Scenario: Damage and repair
    Given the province "Troyes" has a sound loom house built for 35 gold, 10 timber and 6 months
    When a town fire damages it
    Then it makes nothing in its first season and works at half after
    And repairing it costs 17.5 gold, 5 timber and 3 months

  @BLD-061 @BLD-062
  Scenario Outline: Ruin and rebuilding
    Given the province "Orléans" has a "<building>"
    When <cause>
    Then the "<building>" is ruined and makes nothing
    And it can be rebuilt at half cost or cleared

    Examples:
      | building | cause                                       |
      | farm     | its tile is burned                          |
      | market   | the town is plundered and it is chosen      |
      | castle   | the castle is razed                         |
      | market   | it stood neglected at step 1 for 10 years   |

  @BLD-063
  Scenario: Burned tiles rebuild by themselves in peace, town buildings don't
    Given the province "Troyes" has 2 ruined farms on burned tiles and a ruined market
    And "Troyes" is at peace
    When a year passes
    Then one ruined farm is rebuilt by itself
    And the market stays ruined until an owner pays
