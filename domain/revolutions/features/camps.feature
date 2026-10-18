@context-revolutions
Feature: Camps of a revolution's rising
  As the game
  I want the revolution's family to decide who joins each side
  So that a revolution's rising draws the right people, lords and soldiers

  @REVO-026 @REVO-027 @REVO-030 @placeholder
  Scenario Outline: Revolution camp join shares replace the rebellions join table
    # config: families.<id>.camps.revolution.joins
    Given a rising tagged with a revolution of the family "<family>" grows in a province
    And the province has 1000 men of the class "<class>"
    When the month is processed
    Then <joined> men of the class "<class>" join the revolution camp
    And the rebellions join table is not used for that rising

    Examples:
      | family            | class       | joined |
      | faith             | clergy      | 300    |
      | estates           | market_folk | 150    |
      | liberal_national  | scholars    | 250    |
      | freedom           | farmers     | 300    |
      | agrarian          | farmers     | 150    |
      | homeland          | herders     | 100    |
      | socialist_defeat  | craftsmen   | 200    |
      | socialist_defeat  | miners      | 150    |
      | from_above        | farmers     | 0      |

  @REVO-030 @placeholder
  Scenario: Hungry farmers join a liberal revolution faster
    Given a rising tagged with a revolution of the family "liberal_national" grows in a hungry province
    And the province has 1000 farmers
    When the month is processed
    Then 100 farmers join the revolution camp

  @REVO-030
  Scenario: A faith revolution draws only people of the movement's faith
    Given a rising tagged with a revolution of the family "faith" grows in a province
    And the province's homeless are of another faith than the movement
    When the month is processed
    Then none of those homeless join the revolution camp

  @REVO-031
  Scenario Outline: Camp lords and army rules
    Given a rising tagged with a revolution of the family "<family>"
    When the camps are formed
    Then <rule>

    Examples:
      | family           | rule                                                                                  |
      | faith            | lords of the movement's faith who are Wavering or worse join the revolution camp      |
      | faith            | soldiers of the movement's faith desert at 5 percent a month                          |
      | estates          | disloyal lords join the revolution camp with their retinues                           |
      | freedom          | colonial troops of the same people desert at 10 percent a month                       |
      | socialist_defeat | soldiers mutiny at 10 percent a month while war weariness is above 14                 |
      | from_above       | every Disloyal lord, and Wavering lords with the Pious or Proud trait, join the old order |

  @REVO-028
  Scenario: The old order camp stands with the ruler
    Given a rising tagged "french_revolution" in "France"
    And a lord of "France" is "Loyal"
    When the camps are formed
    Then that lord sends his retinue to the ruler
    And the clergy of the state faith calm their provinces

  @REVO-029
  Scenario: A province whose castle the revolution camp holds counts as risen
    Given the revolution camp of a rising tagged "french_revolution" holds the castle of "Paris"
    When the month is processed
    Then the province "Paris" counts as risen
    And the rising's strength, march, sieges and melting away follow the rebellions rules
