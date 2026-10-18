@context-revolutions
Feature: Requirements, signs and sparks compile into the event
  As the game
  I want a revolution's checklist to become the event's trigger and selection
  So that the card and the trigger always agree

  @REVO-010
  Scenario: The build compiles the trigger and the selection modifiers
    Given the revolution "french_revolution" has 1 requirement, 6 signs with need 4 and 2 sparks
    When the revolution layer is built
    Then the event's trigger is all of the requirement and at least 4 of the 6 sign conditions
    And the event's selection has one modifier per spark
    And the event's selection has the spark "Foreign gold backs the movement" with multiplier 2

  @REVO-011 @REVO-012
  Scenario Outline: The grievance condition is a share of provinces
    Given the country "France" has 10 provinces
    And <count> provinces of "France" have the grievance "hungry"
    When the condition "grievance who France id hungry >= 0.2" is evaluated
    Then it is <result>

    Examples:
      | count | result |
      | 1     | false  |
      | 2     | true   |
      | 5     | true   |

  @REVO-013
  Scenario: The class share condition
    Given 12 percent of the people of "Russia" are craftsmen
    When the condition "class_share who Russia class craftsmen >= 0.1" is evaluated
    Then it is true

  @REVO-014
  Scenario Outline: The lords condition
    Given the country "France" has 10 provinces, 4 held by lords
    And the lords of "France" have the loyalties "Loyal, Wavering, Disloyal, In revolt"
    When the condition "lords who France measure <measure>" is evaluated
    Then its value is <value>

    Examples:
      | measure           | value |
      | land_share        | 0.4   |
      | wavering_or_worse | 3     |
      | disloyal_or_worse | 2     |
      | count             | 4     |

  @REVO-015
  Scenario Outline: The war_lost condition
    Given the country "Russia" made peace on the losing side <years> years ago by <terms>
    When the condition "war_lost who Russia within_years 3" is evaluated
    Then it is <result>

    Examples:
      | years | terms                  | result |
      | 1     | giving land            | true   |
      | 2     | paying                 | true   |
      | 2     | being made a subject   | true   |
      | 5     | giving land            | false  |

  @REVO-016
  Scenario: A revolution keeps its event's window
    Given the event "french_revolution" is available from 1750 to 1880
    And the date is 1890
    And every sign of "french_revolution" is lit for "France"
    When the monthly step runs
    Then the revolution "french_revolution" cannot break out

  @REVO-017
  Scenario: The armistices of 1918 keep their existing trigger
    Given the revolution "armistice_1918" has keep_trigger true
    When the revolution layer is built
    Then the event "armistice_1918" keeps its existing trigger
