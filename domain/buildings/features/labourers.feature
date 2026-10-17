@context-buildings
Feature: Building crews
  As a realm with idle people
  I want building sites to take the homeless first
  So that building puts idle people to work

  @BLD-033 @placeholder
  Scenario Outline: Crew size by building
    Given the buildings config of the design
    When a "<building>" site is started
    Then it needs a crew of <crew>

    Examples:
      | building     | crew |
      | farm         | 500  |
      | stone castle | 3000 |
      | canal        | 6000 |

  @BLD-034
  Scenario: The homeless are taken first and don't count toward trouble
    Given the province "Troyes" has 3600 homeless
    When a farm site needing a crew of 500 starts in "Troyes"
    Then 500 homeless join the crew
    And they are fed and steal nothing while they work
    And the province counts 3100 homeless toward the homeless trouble

  @BLD-035
  Scenario: Other classes fill a short crew by share
    Given the province "Reims" has 900 homeless
    When a stone castle site needing a crew of 3000 starts in "Reims"
    Then 900 homeless join the crew
    And 2100 more are taken from every class by its share
    And their job slots stay empty while they build

  @BLD-036
  Scenario Outline: Crew and progress
    Given a site needs a crew of 3000 and 36 months
    And it has a crew of <crew>
    When the building rules are applied
    Then the site takes <months> months

    Examples:
      | crew | months  |
      | 3000 | 36      |
      | 1500 | 72      |
      | 0    | stopped |

  @BLD-037
  Scenario: The crew goes back when the work is done
    Given a loom house site in "Troyes" has a crew of 1000 homeless
    When the loom house is finished
    Then crew members who fit the craftsmen class move into its job slots
    And the rest return to being homeless
