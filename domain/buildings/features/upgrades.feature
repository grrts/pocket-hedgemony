@context-buildings
Feature: Steps and upgrades
  As a realm
  I want to grow buildings step by step on the same place
  So that a market can become a fair and then a trading house

  @BLD-003
  Scenario Outline: Steps a building can reach
    Given the buildings config of the design
    When the building rules are applied
    Then the "<building>" has steps up to <top>

    Examples:
      | building         | top |
      | market           | 3   |
      | house of worship | 3   |
      | drill yard       | 2   |
      | castle           | 5   |
      | road             | 5   |
      | palace           | 3   |

  @BLD-047 @BLD-051 @placeholder
  Scenario Outline: Market steps
    Given the province "Troyes" has a town of size "<town>"
    And the province "Troyes" <charter> a market charter
    And the country "France" <knows> "T3 Bills of exchange"
    When the market is at step <step>
    Then it is a "<name>" with <jobs> market folk
    And the step costs <cost>

    Examples:
      | town        | charter  | knows       | step | name          | jobs | cost                     |
      | village     | lacks    | doesn't know| 1    | weekly market | 1500 | 40 g · 10 timber · 6 mo  |
      | market town | has      | doesn't know| 2    | yearly fair   | 2400 | 100 g · 30 stone · 12 mo |
      | town        | has      | knows       | 3    | trading house | 3000 | 200 g · 40 stone · 18 mo |

  @BLD-049
  Scenario Outline: A step's needs must be met
    Given the province "Troyes" has a weekly market
    And <missing>
    When the player tries to upgrade the market to a yearly fair
    Then the upgrade is refused

    Examples:
      | missing                                          |
      | the province "Troyes" has no market charter      |
      | the province "Troyes" is a village               |
      | the country "France" doesn't know "T6 Merchant fairs and exchanges" |

  @BLD-048
  Scenario Outline: Buildings keep working while upgraded
    Given the province "Reims" has a step <step> "<building>"
    When an upgrade site for the "<building>" is running
    Then the "<building>" works as step <works_as>

    Examples:
      | building | step | works_as |
      | market   | 1    | 1        |
      | harbour  | 2    | 2        |
      | castle   | 2    | 1        |

  @BLD-050
  Scenario Outline: Falling a step
    Given the province "Rouen" has a step <step> "<building>"
    When <cause>
    Then the "<building>" is <result>

    Examples:
      | building | step | cause                                     | result     |
      | market   | 2    | it has been neglected for 10 years        | step 1     |
      | market   | 1    | it has been neglected for 10 years        | ruined     |
      | castle   | 2    | an earthquake hits "Rouen"                | step 1     |
      | school   | 2    | "Rouen" is sacked                         | step 1     |

  @BLD-131
  Scenario Outline: Only unlocked buildings are offered
    Given the country "France" <knows> "<invention>"
    When the player opens the build sheet in "Troyes"
    Then the "<building>" is <shown>

    Examples:
      | knows        | invention                | building       | shown            |
      | knows        | W3 Bombards              | powder mill    | offered          |
      | doesn't know | W3 Bombards              | powder mill    | grey with needs  |
      | doesn't know | C16 railways             | rail station   | grey with needs  |
      | knows        | G14 Written constitution | parliament house | offered        |

  @BLD-157 @placeholder
  Scenario Outline: Road steps
    Given the buildings config of the design
    When the building rules are applied
    Then road step <step> is the "<name>", needing "<unlock>" and <gold> gold

    Examples:
      | step | name       | unlock | gold |
      | 1    | track      | start  | 20   |
      | 2    | road       | B2     | 40   |
      | 3    | paved road | B2     | 120  |
      | 4    | turnpike   | B9     | 180  |
      | 5    | railway    | C16    | 300  |
