@context-troop-movement
Feature: A month played out in days
  As the game
  I want every army to take its day step at the same time, 30 times a month
  So that armies meet on the road, castles stop columns on a given day and fast armies catch slow ones

  @MOVE-001
  Scenario: A month has 30 days
    Given the config "march.daysPerMonth" is 30
    When a turn ends
    Then the day loop runs 30 days

  @MOVE-002
  Scenario: The order of a day
    When a day of the month is played
    Then the steps run in this order:
      | step            |
      | move            |
      | stop checks     |
      | contact         |
      | standing orders |

  @MOVE-003
  Scenario Outline: An army arrives when it has walked enough days
    Given the army "A" walks a step of <step> days from "Paris" to "Troyes"
    And the army "A" has walked <walked> days of it
    When one more day is played
    Then the army "A" stands in "<place>"

    Examples:
      | step | walked | place  |
      | 6    | 4      | Paris  |
      | 6    | 5      | Troyes |
      | 6.5  | 5      | Paris  |
      | 6.5  | 6      | Troyes |

  @MOVE-004
  Scenario: Arriving runs the stop checks
    Given the army "A" is one day from "Langres"
    When the army "A" arrives in "Langres"
    Then the stop checks run for "Langres"

  @MOVE-005
  Scenario: Hostile armies in one province start the battle rules
    Given the country "France" is at war with the country "Burgundy"
    When the French army "A" and the Burgundian army "B" stand in "Langres" at the end of day 22
    Then the battle rules start in "Langres" on day 22

  @MOVE-006
  Scenario: Armies in battle don't move
    Given the army "A" is in a battle that lasts 3 days
    When those 3 days are played
    Then the army "A" adds no days to its step

  @MOVE-007
  Scenario: Food, sickness, sieges and pay run monthly
    When a month is played
    Then food, sickness, sieges and pay are run once, not each day

  @MOVE-008
  Scenario: An army stands where it left until it arrives
    Given the army "A" is walking from "Troyes" to "Langres" with 3 days left
    Then the army "A" stands in "Troyes"
    And it eats, is seen and can be attacked in "Troyes"

  @MOVE-009
  Scenario Outline: Meeting halfway on a border
    Given the country "France" is at war with the country "Burgundy"
    And the French army "A" walks from "Troyes" to "Langres" with <a_left> days left
    And the Burgundian army "B" walks from "Langres" to "Troyes" with <b_left> days left
    When they meet on the border
    Then the battle is fought in "<place>"

    Examples:
      | a_left | b_left | place   |
      | 5      | 2      | Troyes  |
      | 2      | 5      | Langres |

  @MOVE-010
  Scenario: Progress carries into the next month
    Given the army "A" starts a mountain step of 18 days on day 25
    When the next month is played
    Then the army "A" arrives on day 13 of the next month
