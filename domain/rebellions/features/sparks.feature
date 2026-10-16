@context-rebellions
Feature: Sparks
  As the game
  I want single happenings to tip a rioting province into a rising
  So that the player can see why a rising began and avoid the burdens that cause one

  @REBL-004 @REBL-010 @REBL-011
  Scenario Outline: A spark in a rioting province starts a rising at once
    Given the province "Troyes" has 3 grievances
    When "<spark>" happens in the province "Troyes"
    Then a rising starts in the province "Troyes" at once
    And the rebellion card shows "<spark>" as the reason the rising began

    Examples:
      | spark                                                       |
      | the tax rate of the province is raised                      |
      | a levy is called at harvest time                            |
      | an army is quartered for the winter                         |
      | a house of worship of the majority faith is demolished      |
      | a faith tolerance charter is revoked                        |
      | the province's lord is executed                             |
      | the province's lord dies without an accepted heir           |
      | a popular official is dismissed                             |
      | the owner's army loses a battle in or next to the province  |
      | the capital falls                                           |
      | a pretender lands with men                                  |
      | a rival's envoy arrives with gold                           |
      | a preacher of a new faith arrives                           |
      | the ruler dies with a child heir                            |
      | the ruler dies with no heir                                 |

  @REBL-004 @REBL-010
  Scenario Outline: Some sparks need the province to be hungry already
    Given the province "Troyes" has 3 grievances
    And the province "Troyes" <hungry> the grievance "Hungry"
    When "<spark>" happens in the province "Troyes"
    Then a rising <result> in the province "Troyes"

    Examples:
      | hungry       | spark                              | result             |
      | has          | an army requisitions food          | starts at once     |
      | does not have| an army requisitions food          | does not start     |
      | has          | the harvest roll comes up failed   | starts at once     |
      | does not have| the harvest roll comes up failed   | does not start     |

  @REBL-004
  Scenario: A spark does nothing in a grumbling province
    Given the province "Troyes" has 2 grievances
    When "the tax rate of the province is raised" happens in the province "Troyes"
    Then a rising does not start in the province "Troyes"

  @REBL-012 @open-question
  Scenario: A revolution event starts risings in every province that meets its conditions
    # OQ-REBL-4: how a rising is tagged and which provinces "meet its conditions"
    Given the event "french_revolution" fires for the country "France"
    And the provinces "Paris" and "Troyes" of "France" meet the event's conditions
    And the province "Rouen" of "France" does not meet the event's conditions
    When the event raises rebels
    Then a rising starts at once in the province "Paris"
    And a rising starts at once in the province "Troyes"
    And a rising does not start in the province "Rouen"
