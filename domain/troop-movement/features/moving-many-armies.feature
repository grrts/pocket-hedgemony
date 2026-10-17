@context-troop-movement
Feature: Moving many armies
  As a player
  I want to move several armies with one order
  So that a front moves as one plan

  @MOVE-072
  Scenario Outline: March together
    Given the army "A" needs 10 days to reach "Langres" and the army "B" needs 16
    When the player sends both to "Langres" with arrive together <setting>
    Then <result>

    Examples:
      | setting | result                                                       |
      | on      | the army "A" starts 6 days later and both arrive on day 16   |
      | off     | both start at once and arrive on day 10 and day 16           |

  @MOVE-072
  Scenario: Arrive together is on by default
    When the player selects several armies and gives them one destination
    Then arrive together is on

  @MOVE-073
  Scenario: Rally here
    Given the armies "A", "B" and "C" are picked
    When the player taps "Rally here" on "Troyes"
    Then each army marches to "Troyes"
    And they join on arrival in the order they come

  @MOVE-074
  Scenario: New regiments go to the rally point
    Given the realm has set "New regiments go to" "Troyes" and the army "A" stands there
    When a levy gathers or a regiment finishes training
    Then it marches to "Troyes" on its own and joins the army "A"

  @MOVE-075
  Scenario Outline: Fronts with Army divisions
    Given the country "France" <knows> invention "W14 Army divisions"
    When the player draws a front of provinces and gives it armies
    Then <result>

    Examples:
      | knows         | result                                                                                         |
      | knows         | the armies spread along it, intercept within their stretch and retreat along the front      |
      | does not know | no front can be drawn                                                                          |

  @MOVE-127 @feedback-21
  Scenario: Several armies selected at once march together
    Given the player selects 3 armies with a drag-box
    When the player taps a province
    Then all 3 armies get one march order to it, each on its own route
