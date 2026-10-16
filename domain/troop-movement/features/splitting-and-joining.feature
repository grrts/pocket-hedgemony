@context-troop-movement
Feature: Splitting and joining armies
  As a player
  I want to split and join armies in a known number of days
  So that I can shape my forces on the march

  # config: splitDays
  @MOVE-037 @placeholder
  Scenario Outline: Splitting takes time before Army divisions
    Given the country "France" <knows> invention "W14 Army divisions"
    When the player splits the army "A" in two
    Then the split takes <days> days
    And each half keeps its share of food, wagons and companies

    Examples:
      | knows        | days |
      | does not know | 2   |
      | knows        | 0    |

  @MOVE-038
  Scenario Outline: Who leads the other half
    Given the army "A" is led by "Dunois"
    When the player splits it, keeping "Dunois" with the first half
    And the second half has <leader>
    Then the second half is led by <result>

    Examples:
      | leader                  | result                                      |
      | a captain               | the captain                                 |
      | a new commander         | the new commander                           |
      | no captain or commander | its senior company captain with Cunning 0   |

  @MOVE-039
  Scenario: Joining two armies
    Given the armies "A" and "B" stand in "Troyes"
    And the commander of "A" has 5 victories and the commander of "B" has 2
    When the player joins them
    Then the join takes 1 day
    And food and wagons add up
    And the commander of "A" leads and the commander of "B" becomes a captain if there is room
