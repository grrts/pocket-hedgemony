@context-troop-movement
Feature: What stops an army
  As a player
  I want to know exactly what will stop my army and where
  So that the map reads simply and castles are real gates

  @MOVE-040 @MOVE-041
  Scenario Outline: The stop checks
    Given the army "A" marches to "Dijon" through "Langres"
    And in "Langres" <situation>
    When the army "A" arrives in "Langres"
    Then the army "A" <result>
    And the rest of its route is <route>

    Examples:
      | situation                                      | result                       | route             |
      | an enemy army stands                           | stops                        | kept, greyed      |
      | an enemy castle with a garrison stands         | stops                        | kept, greyed      |
      | a snow pass has closed                         | stops and winters there      | kept, greyed      |
      | its food runs out                              | marches on                   | red from that step |

  @MOVE-042
  Scenario: An enemy army blocks only where it stands
    Given an enemy army stands in "Troyes"
    When the army "A" marches from "Paris" past "Troyes" through "Sens"
    Then the army "A" is not stopped in "Sens"

  @MOVE-043 @MOVE-044
  Scenario Outline: Castles always block
    Given the army "A" stands in "Langres" with a hostile garrisoned castle
    When the army "A" is ordered to <move>
    Then the order is <result>

    Examples:
      | move                                               | result  |
      | stay and besiege                                   | allowed |
      | go back to the province it came from               | allowed |
      | go into a neighbouring province its side holds     | allowed |
      | march on to "Dijon"                                | refused |

  @MOVE-043
  Scenario: Besieging with part of the army doesn't open the road
    Given the army "A" besieges the castle of "Langres"
    When the army "B" of the same side arrives in "Langres"
    Then the army "B" stops in "Langres" too

  @MOVE-044
  Scenario: Marching on once the castle falls
    Given the army "A" stopped in "Langres" with its route to "Dijon" greyed
    When the castle of "Langres" is taken
    Then one order resumes the march to "Dijon"

  @MOVE-045 @MOVE-046
  Scenario Outline: Which castles block
    Given the province "Langres" has a castle <castle>
    When an army of a realm at war with <whom> enters "Langres"
    Then the army <result>

    Examples:
      | castle                               | whom                      | result         |
      | with no garrison, of its enemy       | the castle's owner        | is not stopped |
      | with a garrison, of its enemy's ally | the castle owner's ally   | stops          |

  @MOVE-047
  Scenario: The planner routes to a castle, never through it
    Given the province "Langres" has a hostile garrisoned castle on the way to "Dijon"
    When the player plans a route to "Dijon"
    Then the route ends at "Langres" with "stops at Langres until the castle falls"
    And the leg to "Dijon" is drawn in grey

  @MOVE-048 @MOVE-054
  Scenario Outline: Whose land you may enter
    When the army "A" plans a route into <land>
    Then it <may> enter
    And it eats from <eats>

    Examples:
      | land                                 | may     | eats                                         |
      | its own land                         | may     | the locals, refilling                        |
      | a subject's land                     | may     | the reserve, unless the subject's terms feed it |
      | an enemy's land at war with it       | may     | the reserve, then plunder                    |
      | a rebel-held province                | may     | the reserve, then plunder                    |
      | an ally's land                       | may     | the reserve                                  |
      | land of a realm granting passage     | may     | the reserve                                  |
      | land nobody owns                     | may     | the reserve, then plunder                    |

  @MOVE-048 @MOVE-050 @open-question
  # OQ-MOVE-7: diplomacy lets an army enter without passage as an act of war
  Scenario: A realm without passage is closed
    Given the realm "Savoy" is at peace with "France" and grants no passage
    When the army "A" of "France" plans a route whose only way runs through "Savoy"
    Then the planner says "needs passage from Savoy"

  @MOVE-049
  Scenario: Passage withdrawn on the march
    Given the army "A" marches through land of a realm that grants passage
    When the passage is withdrawn on day 10
    Then the army "A" stops at the border on day 10

  @MOVE-051
  Scenario: Caught in a closing pass
    Given the army "A" is in a snow pass on the last day of November in the north
    When the pass closes
    Then the army "A" stops and winters there, hungry

  @MOVE-052
  Scenario: Halt when the enemy is seen
    Given the army "A" is set to "halt when the enemy is seen" on a route through "Troyes" and "Langres"
    When an enemy army is seen in "Langres"
    Then the army "A" stops in "Troyes"

  @MOVE-053
  Scenario: Food running out doesn't stop the army
    Given the reserve of the army "A" runs out on the step into "Langres"
    When the month is played
    Then the army "A" keeps marching
    And its route is red from "Langres"
    And the player gets one notice
