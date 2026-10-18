@context-province
Feature: Charters
  As a player
  I want to grant written privileges to provinces and towns
  So that I can trade something I give up for loyalty and growth

  @PROV-210
  Scenario Outline: What each charter gives and costs
    Given the country "France" owns the province "Lyon"
    When the country "France" grants the province "Lyon" a "<charter>" charter
    Then the province gets <gain>
    And the country gives up <cost>

    Examples:
      | charter         | gain                                         | cost                                        |
      | market charter  | a market that can grow into a yearly fair    | a little gold                               |
      | tax cap         | a tax rate no higher than light              | tax from it                                 |
      | town law        | townsfolk running the town                   | seizing anything there without breaking it  |
      | no quartering   | no armies wintering there                    | winter quarters there                       |
      | faith tolerance | its minority faith worshipping openly        | clergy lords' loyalty; Wrong faith ends there |
      | free trade      | no tolls                                     | toll gold                                   |
      | mining right    | faster digging and new ore deposits          | half the mine's output                      |

  @PROV-211
  Scenario Outline: How a province gains a charter
    Given the province "Lyon" has no "town law" charter
    When <way>
    Then the province "Lyon" has the "town law" charter

    Examples:
      | way                                              |
      | the country grants it                            |
      | the town demands it for a loan and is granted it |
      | rebels force it                                  |

  @PROV-212 @placeholder
  Scenario: Revoking a charter leaves a broken charter for 20 years
    # config: province.charter.broken_years
    Given the province "Lyon" has the "tax cap" charter
    When the country "France" revokes it
    Then the province "Lyon" has the "Broken charter" grievance for 20 years
    And every lord of "France" notices

  @PROV-213
  Scenario Outline: A conqueror keeps or revokes charters
    Given the province "Lyon" has the "free trade" charter
    When the country "Savoy" conquers "Lyon" and <choice> the charter
    Then <result>

    Examples:
      | choice  | result                                                |
      | keeps   | the province "Lyon" still has the "free trade" charter |
      | revokes | the province "Lyon" has the "Broken charter" grievance |

  @PROV-214
  Scenario: Town law needs no official and blocks seizures
    Given the province "Lyon" has the "town law" charter
    Then the town of "Lyon" needs no official
    When the country "France" seizes property in "Lyon"
    Then the charter is broken

  @PROV-215
  Scenario: A mining right hands the mine to a merchant house
    Given the province "Potosí" has a silver mine
    When the country grants a "mining right" charter there
    Then a merchant house runs the mine
    And the country gets half the mine's output
    And the mine digs faster and finds new ore deposits
