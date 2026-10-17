@context-province
Feature: Classes and job slots
  As the game
  I want every person to belong to a class tied to job slots
  So that new buildings take in people and full provinces make homeless

  @PROV-110
  Scenario Outline: Each class works in its own slots
    Given a person of the class "<class>"
    When the game works out the province's stats
    Then their slots are in <slots>

    Examples:
      | class       | slots                                                                                   |
      | farmers     | farms, rice paddies, terraces, raised fields, plantations, irrigation works, empty fields |
      | herders     | ranches, horse studs, empty pasture                                                     |
      | woodsmen    | lumber camps, empty woods                                                               |
      | miners      | mines, saltworks                                                                        |
      | seafolk     | fisheries, harbours, shipyards, empty shore                                             |
      | craftsmen   | loom houses, forges, kilns, tanneries, presses, breweries, factories, rail stations     |
      | market folk | markets, caravanserais and warehouses                                                   |
      | clergy      | houses of worship, almshouses, hospitals                                                |
      | clerks      | seats                                                                                   |
      | scholars    | schools                                                                                 |
      | homeless    | no slots                                                                                |

  @PROV-111
  Scenario: Newborns join their parents' class at once
    Given the province "Troyes" has 48,000 farmers
    When 160 farmers are born this month
    Then the province "Troyes" has 48,160 farmers before deaths and overflow

  @PROV-112 @PROV-115
  Scenario: Troyes builds a loom house
    Given the province "Troyes" has full farms and 3,600 homeless
    When a new loom house with 1,500 craftsman slots is built
    Then 1,500 homeless become craftsmen
    And 2,100 stay homeless

  @PROV-112
  Scenario: Overflow goes to the least-filled slots
    Given the province "Troyes" has more farmers than farm slots
    And its craftsman slots are 60 % filled and its herder slots are 90 % filled
    And no one is homeless
    When the month's overflow is worked out
    Then the extra farmers become craftsmen

  @PROV-112
  Scenario: A tie goes to food classes first
    Given the province "Troyes" has more craftsmen than craftsman slots
    And its farmer slots and its market folk slots are both 70 % filled and least filled
    When the month's overflow is worked out
    Then the extra craftsmen become farmers

  @PROV-113
  Scenario: Overflow never makes scholars or soldiers
    Given the province "Troyes" has more farmers than farm slots
    And its school has empty scholar slots
    When the month's overflow is worked out
    Then no farmer becomes a scholar
    And no farmer becomes a soldier

  @PROV-114
  Scenario: With every slot full, overflow becomes homeless
    Given every slot in the province "Troyes" is full
    And the farmers have 500 more born than died this year
    When the overflow is worked out
    Then the province "Troyes" has 500 more homeless

  @PROV-115
  Scenario: Homeless fill gaps left by deaths and levies first
    Given the province "Troyes" has 1,000 homeless
    When a levy takes 800 farmers from the farms
    Then 800 homeless take the empty farm slots

  @PROV-116 @placeholder
  Scenario: Homeless drift to the emptiest neighbour in their own realm first
    # config: province.decided.homeless_drift_share (2 % a year)
    Given the province "Troyes" has 3,600 homeless
    And the French province "Sens" and the Burgundian province "Dijon" border "Troyes"
    And "Dijon" has emptier slots than "Sens"
    When the month ends
    Then a share of the homeless of "Troyes" move to "Sens"

  @PROV-117
  Scenario: A short class leaves slots empty
    Given the province "Troyes" has a new forge with 1,500 craftsman slots
    And no class has extra people and no one is homeless
    When the month ends
    Then the forge's slots stay empty until overflow arrives
    And the forge is fallow

  @PROV-118
  Scenario: Fleet crews come from seafolk
    Given the province "Lisboa" has 3,000 seafolk
    When the country "Portugal" crews a fleet in "Lisboa"
    Then the crews are taken from the seafolk of "Lisboa"
