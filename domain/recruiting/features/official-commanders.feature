@context-recruiting
Feature: What official commanders bring and cost
  As a player
  I want commanders drawn from officials to behave as servants of the crown
  So that the choice between officials, lords and others has real trade-offs

  @RECR-088
  Scenario: Officials obey
    Given an army commanded by a commissioned official
    When the war goes on for years
    Then the commander never refuses a command
    And never goes home with his men mid-war
    And never defects with land

  @RECR-089 @placeholder
  # config: officialVictory (D-RECR-20)
  Scenario: Victories stay with the crown
    Given the lord "Count of Foix" is Wavering and the lord "Duke of Bourbon" is Loyal
    When an army commanded by a commissioned official wins a battle
    Then the lord "Count of Foix" is Loyal
    And the lord "Duke of Bourbon" is Loyal
    And the ruler's victories rise by 1
    And no single lord grows from it

  @RECR-090 @placeholder
  Scenario Outline: They come home better
    Given a commissioned official with <victories> victories is released to a province
    Then they give <factor> times their type's effect there

    Examples:
      | victories | factor |
      | 2         | 1      |
      | 3         | 1.5    |

  @RECR-091
  Scenario: A Proud lord under an official wavers
    Given the lord "Count of Foix" is Proud and serves as captain under an official
    When a season passes
    Then the lord "Count of Foix" wavers a step

  @RECR-092
  Scenario Outline: A Proud lord refuses his retinue
    Given an army is commanded by a commissioned official
    And the lord "<lord>" <proud>
    And the war aim <want> his Want
    When the lords are called to that army
    Then the lord "<lord>" <result>

    Examples:
      | lord            | proud          | want   | result                  |
      | Count of Foix   | is Proud       | is not | refuses to bring his retinue |
      | Count of Foix   | is Proud       | is     | brings his retinue      |
      | Duke of Bourbon | is not Proud   | is not | brings his retinue      |

  @RECR-093
  Scenario: No retinue
    When an official is commissioned as commander
    Then the official brings no men of their own

  @RECR-094
  Scenario: Losing two at once
    Given a commissioned official commands an army
    When the official is captured in battle
    Then the realm has lost a commander and an official
    And paying the ransom brings both back

  @RECR-095 @placeholder
  # config: landRequestVictories 6 (officials only), theirMan 8 victories and 5 years (any commander) (D-RECR-16)
  Scenario Outline: Generals who grow too big
    Given a commissioned official with <victories> victories who led the same regiments <years> years
    When the player answers "<answer>"
    Then <result>

    Examples:
      | victories | years | answer          | result                                                         |
      | 6         | 1     | refuse land     | the official becomes Ambitious                                 |
      | 6         | 1     | grant land      | the official becomes a lord with his old soldiers as retinue   |
      | 8         | 5     | none            | the official becomes "their man"                               |
      | 5         | 1     | none            | the official asks for nothing                                  |

  @RECR-096
  Scenario Outline: Who else leads
    Given a royal army needs a commander
    When the player picks "<leader>"
    Then <result>

    Examples:
      | leader         | result                                                        |
      | the ruler      | the ruler leads                                               |
      | an heir        | the heir leads                                                |
      | a lord         | the lord can lead only his own retinue as a captain           |
      | a hired captain | the captain comes with his mercenary company                      |
      | an exile       | the exile becomes an official of the closest type and can be commissioned |
