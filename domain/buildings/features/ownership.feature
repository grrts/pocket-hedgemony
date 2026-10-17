@context-buildings
Feature: Owners and builders
  As a realm
  I want lords, the clergy, towns, companies and the people to build with their own means
  So that others can build for me, but what they build is theirs

  @BLD-046
  Scenario Outline: Ways to gain a building
    Given the buildings config of the design
    When a building is gained by <way>
    Then it stands in the province with owner <owner>

    Examples:
      | way                                  | owner                         |
      | the crown building it                | the crown                     |
      | a lord building it                   | the lord                      |
      | the people building village works    | the commons                   |
      | conquest, its owners staying         | its old owner                 |
      | an event                             | the owner the event names     |
      | the start of the game                | as set by the catalogue       |

  @BLD-079
  Scenario: The owner pays and decides
    Given the lord "Count of Champagne" owns a market in "Troyes"
    When the building rules are applied
    Then the lord pays its upkeep
    And only the lord decides its upgrades, demolition and conversion

  @BLD-080
  Scenario: Paying for a building in a lord's province
    Given the lord "Count of Champagne" holds "Troyes" at loyalty "wavering"
    When the crown pays for a loom house in "Troyes"
    Then the lord owns the loom house
    And the lord's loyalty rises one step to "loyal"

  @BLD-081
  Scenario Outline: A lord's buildings follow the lord
    Given the lord "Duke of Brittany" owns a castle in "Rennes"
    When <event>
    Then the castle belongs to <owner>

    Examples:
      | event                              | owner               |
      | the lord defects                   | the lord            |
      | the lord's line dies out           | the crown           |
      | the crown seizes the lord's land   | the crown           |

  @BLD-082
  Scenario: The clergy build their own kinds
    Given the clergy of "Troyes" have wealth from tithes
    When the clergy build
    Then they may build houses of worship, monasteries, almshouses, hospitals and church schools
    And they pay their upkeep

  @BLD-083
  Scenario: A chartered town's buildings
    Given the province "Troyes" has a "Town law" charter
    And the town of "Troyes" owns the town walls
    When the crown tries to demolish the town walls
    Then the charter must be broken first

  @BLD-084
  Scenario: A company keeps half the output
    Given a merchant house holds a "Mining right" in "Kutná Hora"
    When it builds a silver mine there
    Then the merchant house owns the mine and keeps half its output

  @BLD-085
  Scenario: The people's buildings
    Given the commons own a farm in "Champagne"
    When the building rules are applied
    Then the farm has no upkeep
    And if the crown demolishes it the province gains a "Burned homes" grievance

  @BLD-086
  Scenario Outline: Lords build by trait
    Given a lord with trait "<trait>" has wealth to build
    When the building rules are applied
    Then he builds <choice> first

    Examples:
      | trait   | choice                                      |
      | Builder | the most of anything                        |
      | Greedy  | markets and mines                           |
      | Pious   | houses of worship and monasteries           |
      | Warlike | castles and drill yards                     |

  @BLD-087
  Scenario: The clergy's order of building
    Given the clergy of a faith have no house of worship in a town of their faith
    When the building rules are applied
    Then they build a house of worship there first
    And then monasteries, almshouses where there are homeless, hospitals in plague years and schools

  @BLD-088
  Scenario: Chartered towns' order of building
    Given the town of "Troyes" holds a "Town law" charter
    When the building rules are applied
    Then it builds market steps, walls and a bridge before craft buildings

  @BLD-089
  Scenario: Companies build on their routes
    Given a trading company holds rights in "Malacca"
    When the building rules are applied
    Then it builds warehouses and trading houses on its routes and mines and plantations it holds rights to
