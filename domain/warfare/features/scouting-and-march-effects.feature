@context-warfare
Feature: Seeing the enemy and what a march does to an army
  As a player
  I want to see enemy armies only where my people and scouts are, and pay for forced marches
  So that ambushes and surprise attacks are possible on a small map

  # Marching itself (routes, speeds, days) belongs to troop-movement.
  # Config keys: warfare.scouting.riders_per_province, warfare.rumour_error, warfare.forced_march

  @WAR-066 @placeholder
  Scenario: Forced march costs sickness, levies and the first day of battle
    Given an army on forced march with 4000 levies
    When the day ends
    Then its sickness is doubled
    And 2 % of its levies desert each week
    And if it arrives into a battle it has -10 % strength on the first day

  @WAR-067
  Scenario: A careful march can't be ambushed
    Given an army marching Careful
    When the day ends
    Then it cannot be ambushed
    And its scouts see two provinces ahead

  @WAR-068 @placeholder
  Scenario Outline: Where you see enemy armies
    Given the country "France" has an army with <riders> light horse at "Troyes"
    And an enemy army stands <distance> provinces from "Troyes" outside France
    When the day ends
    Then France <sees> that enemy army

    Examples:
      | riders | distance | sees           |
      | 0      | 1        | sees           |
      | 0      | 2        | does not see   |
      | 500    | 2        | sees           |
      | 1000   | 3        | sees           |
      | 1000   | 4        | does not see   |

  @WAR-068
  Scenario: Enemy armies in your own provinces and next to your castles are seen
    Given an enemy army stands in a French province next to a French castle
    When the day ends
    Then France sees that enemy army

  @WAR-069 @placeholder
  Scenario: Armies further away are rumours
    Given an army of 8000 men near "Beaune" beyond French sight
    When the day ends
    Then France sees a rumour of between about 5333 and about 10667 men near "Beaune"

  @WAR-070
  Scenario: Scouting is worked out only near the player
    Given two AI armies far from any of the player's armies
    When the day ends
    Then rumours and scouting are not worked out for them
