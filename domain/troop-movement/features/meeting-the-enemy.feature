@context-troop-movement
Feature: Meeting the enemy
  As a player
  I want armies to meet, slip away, retreat, intercept and chase on the map
  So that speed and cunning matter and nothing teleports

  @MOVE-055 @MOVE-057
  Scenario Outline: Withdrawing before battle
    Given the army "B" has standing order "retreat if outnumbered" 3 to 2
    And the army "B" sees the army "A" at <shown> men while it has <own> men
    And the commander of "B" has Cunning <b_cunning> and the commander of "A" has Cunning <a_cunning>
    And the army "B" <trapped>
    When both armies end a day in "Langres"
    Then the army "B" <result>

    Examples:
      | shown | own  | b_cunning | a_cunning | trapped      | result     |
      | 14200 | 8000 | 2         | 4         | is not trapped | must fight |
      | 14200 | 8000 | 4         | 2         | is not trapped | withdraws  |
      | 14200 | 8000 | 4         | 2         | is trapped   | must fight |
      | 9000  | 8000 | 4         | 2         | is not trapped | fights     |
      | 14200 | 8000 | 3         | 3         | is not trapped | must fight |

  @MOVE-055
  Scenario: A rumour counts at its shown size
    Given the army "B" sees a rumour of "about 6000" while the real army has 8000
    When "B" checks its standing order
    Then it counts 6000 men

  @MOVE-056
  Scenario Outline: Where a withdrawing side goes
    Given the army "B" <came>
    When it withdraws from "Langres"
    Then it steps back to <to>

    Examples:
      | came                       | to                                                       |
      | came from "Dijon"          | "Dijon"                                                  |
      | was standing still         | the neighbouring friendly province with the fewest enemies |

  @MOVE-058
  Scenario Outline: A broken army drops what it can't carry
    Given the army "B" breaks in battle
    And the winner <horse> held the field with horse
    Then the army "B" drops half its wagons
    And it <guns> its guns

    Examples:
      | horse  | guns  |
      | has    | drops |
      | has not | keeps |

  # config: retreatMaxProvinces
  @MOVE-059 @MOVE-060 @MOVE-063 @placeholder
  Scenario: Retreat to the nearest refuge
    Given the army "B" breaks in "Langres"
    And its side holds a castle in "Dijon", 1 province away
    When it retreats
    Then it marches to "Dijon" by the fastest route on forced march
    And it takes no orders and can't besiege on the way
    And on reaching "Dijon" it is an ordinary army again and fled men who come back join it

  @MOVE-060
  Scenario: A broken army doesn't stop for its own castles
    Given the broken army "B" passes a castle of its own side on its retreat
    Then it is not stopped there

  @MOVE-061
  Scenario: Caught on the run
    Given the broken army "B" is retreating
    When an enemy army meets it
    Then they fight at once
    And the army "B" can't withdraw and breaks again at the first lost sector

  @MOVE-062 @placeholder
  Scenario Outline: Trapped armies surrender
    Given the army "B" breaks with no refuge within 3 provinces
    And its commander has Cunning <cunning>
    Then its men become the winner's prisoners
    And its commander <fate>

    Examples:
      | cunning | fate                                 |
      | 3       | is captured                          |
      | 4       | gets away alone to the capital       |

  @MOVE-064 @MOVE-065
  Scenario Outline: Intercepting
    Given the army "A" has standing order "<order>" and <route>
    And an enemy army of 6000 is seen in a neighbouring province with 5 days left on its step
    And the army "A" has <men> men and its step there takes <days> days
    When the day's standing orders run
    Then the army "A" <result>

    Examples:
      | order  | route                               | men  | days | result                 |
      | attack | no player route                     | 8000 | 4    | turns to march on it   |
      | attack | a player route                      | 8000 | 4    | keeps its route        |
      | attack | a player route with Attack on the way | 8000 | 4  | turns to march on it   |
      | attack | no player route                     | 5000 | 4    | keeps its place        |
      | attack | no player route                     | 8000 | 6    | keeps its place        |
      | wait   | no player route                     | 8000 | 4    | keeps its place        |

  @MOVE-064
  # D-MOVE-17: only an army that is seen can be intercepted
  Scenario: A rumour is not intercepted
    Given the army "A" has standing order "attack" and no player route
    And an enemy army of 6000 is known only as a rumour in a neighbouring province with 5 days left on its step
    And the army "A" has 8000 men and its step there takes 4 days
    When the day's standing orders run
    Then the army "A" keeps its place

  @MOVE-066
  Scenario: Chasing an enemy out of sight
    Given the army "A" follows the enemy army "B"
    When "B" disappears from sight after being last seen in "Beaune"
    Then the army "A" walks to "Beaune" and stops there with a notice

  @MOVE-067
  Scenario: Allies share the forage limit
    Given the allied armies "A" with 6000 men and "C" with 2000 men stand in "Troyes"
    Then they don't fight or block each other
    And "A" gets three quarters of the forage of "Troyes" and "C" one quarter
