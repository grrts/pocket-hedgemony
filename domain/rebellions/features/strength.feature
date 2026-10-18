@context-rebellions
Feature: Strength of a rising
  As the game
  I want a rising's strength to come from its men, arms, leader, ground and food
  So that some risings are crushed quickly and others last for years

  @REBL-021 @REBL-022
  Scenario: Strength is men times arms times leader times ground
    Given a rising in the province "Troyes" has 3400 men
    And the rising carries "Old weapons"
    When its strength is computed
    Then its strength is 3400 men times 0.6 times its leader factor times its ground factor
    And in battle the rebels fight as the kind "Rebel band" under the warfare battle rules

  @REBL-023 @REBL-024 @placeholder
  Scenario Outline: Men join by class shares each month while the rising grows
    # config: rebellions.join_share.*
    Given a rising with the cause "<cause>" is growing in the province "Troyes"
    And the province "Troyes" has 1000 men of the class "<class>"
    When the month is processed
    Then <joined> men of the class "<class>" join the rising
    And their job slots go empty

    Examples:
      | cause  | class       | joined |
      | Town   | homeless    | 300    |
      | Hunger | farmers     | 100    |
      | Town   | craftsmen   | 100    |
      | Hunger | craftsmen   | 20     |
      | Tax    | clergy      | 0      |
      | Tax    | scholars    | 0      |

  @REBL-024 @placeholder
  Scenario: Faith and homeland risings draw everyone of the faith or language
    Given a rising with the cause "Faith" is growing in the province "Prague"
    And 1000 men of another class in "Prague" share the rebels' faith
    When the month is processed
    Then 80 of them join the rising

  @REBL-024
  Scenario Outline: Clergy and scholars join only faith and new-ideas risings
    Given a rising with the cause "<cause>" is growing in the province "Paris"
    When the month is processed
    Then clergy and scholars <join> the rising

    Examples:
      | cause     | join     |
      | Faith     | may join |
      | New ideas | may join |
      | Hunger    | never join |
      | Town      | never join |

  @REBL-024
  Scenario: A lord's retinue joins all at once
    Given the lord "Duke Philip of Burgundy" has a retinue of 4000 men
    When "Duke Philip of Burgundy" joins a rising
    Then all 4000 men of his retinue join the rising at once

  @REBL-025
  Scenario: The rising stops growing once its cause is fixed
    Given a rising with the cause "Tax" is growing in the province "Troyes"
    When the tax rate of the province "Troyes" drops so that "Heavy taxes" ends
    Then the rising stops growing

  @REBL-026
  Scenario: Rebels are no longer recruits
    Given the province "Troyes" has 2000 recruits
    When 500 men of "Troyes" join a rising
    Then the men who joined are not counted as recruits for the owner

  @REBL-027 @REBL-028 @placeholder
  Scenario Outline: Arms follow their sources
    # config: rebellions.arms
    Given a rising in the province "Troyes" has the sources "<sources>"
    When its arms are set
    Then the rising carries "<arms>" with a multiplier of <mult>

    Examples:
      | sources                         | arms         | mult |
      | none                            | Tools        | 0.4  |
      | a forge in the province         | Old weapons  | 0.6  |
      | a forge and a market            | Armed        | 0.8  |
      | a captured castle's store       | Armed        | 0.8  |
      | foreign gold                    | Armed        | 0.8  |
      | a lord's retinue                | Soldiers     | 1.0  |
      | deserters                       | Soldiers     | 1.0  |
      | a rival's troops                | Soldiers     | 1.0  |
      | a pretender's army              | Soldiers     | 1.0  |

  @REBL-028
  Scenario: A hunger rising in a farm province stays poorly armed unless someone arms it
    Given a hunger rising holds a farm province with no forge, market or castle
    And nobody pays or arms the rebels
    When its arms are set
    Then the rising carries "Tools"

  @REBL-019
  Scenario: A veteran leader raises the rebels' arms one step
    Given a rising carrying "Tools" is led by a veteran
    When the rebels fight a battle
    Then they fight as if carrying "Old weapons"

  @REBL-029 @REBL-030
  Scenario Outline: Ground and walls help the rebels
    Given a rising holds the province "<province>" with the ground "<ground>"
    When the rebels fight in their province
    Then the rebels <bonus>

    Examples:
      | province  | ground    | bonus                                    |
      | Asturias  | mountains | get the "Locals know the land" bonus     |
      | Ardennes  | forest    | get the "Locals know the land" bonus     |
      | Champagne | farmland  | get no "Locals know the land" bonus      |

  @REBL-030
  Scenario: Rebels holding a castle fight from its walls
    Given a rising holds the castle of the province "Troyes"
    When an army attacks the rebels in "Troyes"
    Then the rebels fight from the castle's walls

  @REBL-031 @REBL-032 @REBL-033 @placeholder
  Scenario: Rebels without food shrink
    # config: rebellions.starving_loss
    Given a rising of 3000 men holds the province "Troyes"
    And the local store of "Troyes" is empty
    And no tiles are left to forage in "Troyes"
    When the month is processed
    Then the rising loses 300 men to hunger and desertion

  @REBL-031 @REBL-033
  Scenario: Foraging burns tiles
    Given a rising holds the province "Troyes"
    And the local store of "Troyes" is empty
    When the rebels forage
    Then tiles of "Troyes" are burned
    And the province "Troyes" gets the grievance "Burned homes"
