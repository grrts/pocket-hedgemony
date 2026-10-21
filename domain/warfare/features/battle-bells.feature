@context-warfare
Feature: Battle: the bell, hits, the flee share and breaking
  As a player
  I want every bell to run in the same order with countable hits and losses
  So that I can follow the battle and read why it was won

  # Config keys: warfare.hits_per_bell, warfare.flee.base, warfare.flee.content_factor, warfare.flee.hired,
  # warfare.flee.per_month_owed, warfare.flee.rebel, warfare.kinds.<kind>.break_point

  @WAR-111
  Scenario: The order of a bell
    Given a battle bell
    When the bell is resolved
    Then it runs in this order:
      | step                  |
      | orders                |
      | shooting              |
      | charges               |
      | melee                 |
      | breaking              |
      | depth and rotation    |
    And in the orders step the commander with less Cunning gives his orders first, then the other, then Elite companies take their free order

  @WAR-112
  Scenario Outline: The first bell is for shooting
    Given the attacker's commander has a style using the approach "<approach>"
    When the first bell is fought
    Then <result>

    Examples:
      | approach     | result                                          |
      | Breakthrough | only shooting happens                           |
      | Assault      | the lines meet with no shooting for either side |

  @WAR-113 @placeholder
  Scenario: Hits of a company
    Given the date is 1450
    And a company of 1000 men in the front of arm "levy foot" at level 2
    And no other modifiers apply
    When it fights a bell
    Then it deals 25 hits

  @WAR-113 @placeholder
  Scenario Outline: Hit modifiers
    Given the date is 1450
    And a company of 1000 men in the front of arm "levy foot" at level 2
    And <condition>
    When it fights a bell
    Then it deals <hits> hits

    Examples:
      | condition                                          | hits |
      | it is hungry                                       | 20   |
      | it is tired after 3 bells in a row                 | 22.5 |
      | it arrived by forced march on the first day        | 22.5 |
      | it is level 1                                      | 22.5 |
      | it is level 4                                      | 30   |

  @WAR-114 @WAR-115 @placeholder
  Scenario Outline: The flee share follows how content the realm is
    Given the country "France" has <content> % of its people in calm provinces
    When a French levy company takes 100 hits
    Then <fled> men flee and <killed> are killed and <wounded> are wounded

    Examples:
      | content | fled | killed | wounded |
      | 100     | 20   | 40     | 40      |
      | 70      | 29   | 35.5   | 35.5    |
      | 30      | 41   | 29.5   | 29.5    |
      | 0       | 50   | 25     | 25      |

  @WAR-116 @placeholder
  Scenario Outline: The content share used by each kind
    Given a company of kind "<kind>" <condition>
    When the bell is resolved
    Then its flee share is <flee>

    Examples:
      | kind          | condition                                            | flee   |
      | hired company | owed no pay                                          | 30 %   |
      | hired company | owed 2 months of pay                                 | 50 %   |
      | rebel band    | in any realm                                         | 50 %   |
      | retinue       | of a disloyal lord                                   | 50 %   |
      | retinue       | of a wavering lord whose lands are 60 % content      | 41 %   |
      | garrison      | defending its own province's castle                  | 20 %   |

  @WAR-117 @WAR-118 @placeholder
  Scenario: Fled men count toward the break point
    Given a levy company of 1000 men with break point 25 %
    When it has lost 100 killed, 100 wounded and 60 fled
    Then the company breaks
    And it leaves the line and counts as fled for the pursuit

  @WAR-119
  Scenario: A sector left by one side is won by the other
    Given the last French company in the pasture sector breaks
    When the bell is resolved
    Then the pasture sector is won by the other side
    And its companies can Turn or Drive next bell

  @WAR-120 @placeholder
  Scenario Outline: When an army breaks
    Given an army that started in 6 sectors
    And <condition>
    When the bell is resolved
    Then the army <breaks>

    Examples:
      | condition                                                                 | breaks       |
      | it has lost 4 sectors                                                     | breaks       |
      | it has lost 3 sectors                                                     | does not break |
      | its total losses pass the men-weighted average break point of its companies | breaks     |
      | its camp is taken by Drive and it has lost 2 sectors                      | breaks       |
      | its camp is taken by Drive and it has lost 1 sector                       | does not break |

  @WAR-121
  Scenario: Both break in the same bell
    Given both armies pass their break point in the same bell
    And the army of "Burgundy" is further past its break point
    When the bell is resolved
    Then only the army of "Burgundy" breaks

  @WAR-089 @WAR-105 @WAR-110 @WAR-123 @placeholder
  Scenario: Worked example: Troyes, 1450
    Given the date is 1450
    And the province "Troyes" has the sectors Fields, Fields, Fields, Pasture, Pasture, Woods, Town
    And the army of "France" defends under "Jean de Dunois" in style "Three battles" with Might 3, Cunning 4, Logistics 2:
      | companies                                 |
      | 4000 levy foot (Line, level 1)            |
      | 2000 archers (Shot, level 2)              |
      | 1000 knights (Shock, Heavy, level 3)      |
    And the army of "Burgundy" attacks under "the Bastard of Burgundy" in style "Charge en haie" with Might 3, Cunning 2, Logistics 1:
      | companies                                         |
      | 5000 hired armoured foot (Line, Heavy, level 4)   |
      | 2000 knights (Shock, Heavy, level 3)              |
    And 70 % of French people live in calm provinces
    When the battle is fought
    Then the French flee share is 29 %
    And in bell 2 the Burgundian knights charge the pastures and both pasture sectors break
    And in bell 3 "Burgundy" gives 2 orders first and "France" gives 3 orders after
    And after bell 6 neither army has broken
    And at night the Burgundian withdrawal counts as breaking with half the pursuit, because his Cunning is lower
    And "France" holds the field
