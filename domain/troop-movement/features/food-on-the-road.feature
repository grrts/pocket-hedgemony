@context-troop-movement
Feature: Food on the road
  As a player
  I want the route to show how long the food lasts
  So that I see where my army will go hungry before I send it

  @MOVE-068
  Scenario Outline: The food colour of the route
    Given the army "A" plans a route abroad
    And on arrival at a province its reserve is <reserve> of full
    And its reserve <covers> the march
    Then that step of the route is <colour>

    Examples:
      | reserve        | covers       | colour |
      | three quarters | covers       | green  |
      | a third        | covers       | yellow |
      | nothing        | doesn't cover | red   |

  @MOVE-069
  Scenario: The point of no return
    Given the army "A" plans a route leaving its realm's land
    Then a flag marks the last province from which it can still get home before its reserve runs out

  # config: refillDaysPer10Pct
  @MOVE-070 @placeholder
  Scenario: Refill and go
    Given the army "A" has 40 percent of its reserve on a route past its own castle at "Troyes"
    And "Troyes" has the most food above its siege reserve of the realm's castles on the way
    When the player chooses "Refill and go"
    Then a stop at "Troyes" is added to the route
    And the army "A" waits 6 days there to refill

  @MOVE-071 @open-question
  # OQ-MOVE-6: the code refills only where the army stops at month end
  Scenario: Refilling while passing through own provinces
    Given the army "A" marches from "Paris" through "Troyes", both French, toward "Langres"
    When the month is played
    Then its reserve refills in "Paris" and "Troyes" as the warfare design says
