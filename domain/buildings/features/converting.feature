@context-buildings
Feature: Converting buildings
  As an owner
  I want to turn a building into another of the same kind
  So that I can adapt without starting again

  @BLD-075
  Scenario: A farm changes its crop free in a season
    Given the province "Troyes" has a farm growing grain
    When the owner sets the crop to flax
    Then the farm grows flax after one season at no cost

  @BLD-076
  Scenario: A house of worship is given to another faith
    Given the province "Constantinople" has the church "Hagia Sophia"
    When the 1453 conversion event fires
    Then "Hagia Sophia" becomes a mosque
    And the cost in grievances is set by the religion context

  @BLD-077 @placeholder
  Scenario Outline: A craft building or factory changes its trade at half cost
    Given a "<from>" costs <cost> gold to build as "<to>"
    When the owner converts the "<from>" to a "<to>"
    Then the conversion costs <half> gold

    Examples:
      | from             | to             | cost | half |
      | loom house       | tannery        | 35   | 17.5 |
      | textile factory  | cannery        | 200  | 100  |

  @BLD-078
  Scenario: A slighted castle
    Given the crown owns a castle in "Orléans"
    When the crown slights it
    Then the castle is a ruin
    And it rebuilds at half cost
