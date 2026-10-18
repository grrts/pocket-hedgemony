@context-warfare
Feature: Sieges
  As a player
  I want castles to fall by shot, breaches, hunger, storms, terms or gold
  So that castles on roads, passes and river crossings matter

  # Config keys: warfare.castles, warfare.castles.hills, warfare.castles.mountains, warfare.siege.close_ratio,
  # warfare.siege.shot_per_month, warfare.siege.b7_multiplier, warfare.siege.repair_men, warfare.siege.sally_share,
  # warfare.siege.hunger_loss, warfare.siege.hunger_break, warfare.siege.fever_after_months,
  # warfare.storm.room_per_breach, warfare.storm.losses, warfare.storm.scaling, warfare.sack.plunder,
  # warfare.relief_bonus, warfare.ai_honours_relief_days, warfare.bribe.pay_owed_months

  @WAR-159 @placeholder
  Scenario Outline: Castle numbers
    Given a castle of type "<castle>" on ground "<ground>"
    When the siege is evaluated
    Then its walls bonus is <walls>
    And it needs <shot> shot or <mining> months of mining per breach
    And its garrison room is <room>

    Examples:
      | castle               | ground    | walls  | shot | mining | room |
      | earthwork ring fort  | farmland  | +50 %  | 30   | 2      | 1000 |
      | stone castle         | farmland  | +100 % | 20   | 4      | 2000 |
      | bastion fort         | farmland  | +100 % | 80   | 6      | 3000 |
      | star fort            | farmland  | +150 % | 150  | 8      | 5000 |
      | stone castle         | hills     | +125 % | 20   | 4      | 2000 |
      | stone castle         | mountains | +150 % | 20   | 4      | 2000 |

  @WAR-160
  Scenario: An empty castle falls at once
    Given the castle of "Langres" has no garrison
    When an army of "France" besieges it
    Then the castle of "Langres" falls at once

  @WAR-161 @placeholder
  Scenario Outline: Closing a castle
    Given a castle with a garrison of 300
    And <besiegers> men besiege it
    When the siege is evaluated
    Then the castle is <state>

    Examples:
      | besiegers | state      |
      | 6000      | closed     |
      | 900       | closed     |
      | 800       | not closed |

  @WAR-161
  Scenario Outline: An open castle can be fed
    Given a castle that is not closed
    And it stands on <tile>
    And the sea <blockade>
    When the siege is evaluated
    Then it can be fed <how>

    Examples:
      | tile           | blockade         | how                               |
      | an inland tile | is not relevant  | by road from its own side         |
      | a shore tile   | is not blockaded | by road and by sea                |
      | a shore tile   | is blockaded     | by road only                      |

  @WAR-162 @placeholder
  Scenario: The garrison and the townsfolk eat
    Given a castle with a garrison of 300 and 500 townsfolk on its tile
    When a month of siege passes
    Then 800 rations are eaten from the castle store

  @WAR-162
  Scenario: Driving out the townsfolk
    Given a besieged castle's commander drives out the townsfolk
    When the siege is evaluated
    Then they no longer eat from the castle store
    And the provinces next door gain refugees and Burned homes

  @WAR-163
  Scenario: The besiegers eat from their own supply
    Given an army of "Burgundy" besieges a French castle
    When a month of siege passes
    Then it eats from its reserve, then plunders the province around it tile by tile

  @WAR-164 @placeholder
  Scenario Outline: Shot and breaches
    Given a castle of type "<castle>"
    And the besiegers have <guns>
    And the besieging country <b7> "B7 Siege parallels"
    When the siege is evaluated
    Then the besiegers add <shot> shot a month

    Examples:
      | castle       | guns          | b7            | shot |
      | stone castle | 4 bombards    | does not know | 8    |
      | stone castle | 4 bombards    | knows         | 12   |
      | stone castle | 10 field guns | does not know | 10   |

  @WAR-164 @placeholder
  Scenario: Mining without guns
    Given a stone castle besieged by an army with no guns
    When 4 months of mining pass
    Then the castle has 1 breach

  @WAR-164 @placeholder
  Scenario: A Siege master breaches faster
    Given a besieging commander with trait "Siege master"
    When the siege is evaluated
    Then his breaches come 25 % faster

  @WAR-165 @placeholder
  Scenario Outline: Repairing breaches
    Given a besieged castle with 2 breaches
    And its garrison <has>
    When a month of siege passes with no new breach
    Then the castle has <breaches> breaches

    Examples:
      | has                          | breaches |
      | has a warden                 | 1        |
      | has 200 spare men            | 1        |
      | has no warden and no spare men | 2      |

  @WAR-166 @placeholder
  Scenario: A sally
    Given a besieged castle with a garrison of 900
    When the garrison sallies
    Then 300 men fight a one-bell battle against the siege camp
    And the garrison may sally only once that month

  @WAR-167 @placeholder
  Scenario: A starving garrison
    Given a besieged castle with an empty store and a garrison of 1000
    When a month of siege passes
    Then the garrison has 900 men
    And its break point is 10 % lower

  @WAR-168 @placeholder
  Scenario: Camp fever
    Given an army has besieged the same castle for 3 months
    When the 4th month of siege passes
    Then the besiegers' sickness is doubled

  @WAR-169 @placeholder
  Scenario Outline: Storming
    Given a castle of type "<castle>" with <breaches> breaches
    When the siege is evaluated
    Then the besieger <can> storm it
    And the storm is fought on one sector of room <room>

    Examples:
      | castle              | breaches | can        | room |
      | stone castle        | 0        | cannot     | 0    |
      | stone castle        | 1        | can        | 500  |
      | stone castle        | 2        | can        | 1000 |
      | earthwork ring fort | 0        | can, by scaling the walls at double losses | 0 |

  @WAR-169 @placeholder
  Scenario: The storm
    Given a stone castle on farmland with 1 breach
    When the besieger storms it
    Then the storm lasts up to 6 bells
    And the garrison gets a walls bonus of about +67 %
    And the stormers' losses are x1.5

  @WAR-170
  Scenario Outline: How a siege ends
    Given the castle of "Troyes" is besieged by "Burgundy"
    When the siege ends by <ending>
    Then <result>

    Examples:
      | ending         | result                                                                                         |
      | honours of war | the garrison marches out with its arms to the nearest friendly castle and the castle is taken whole |
      | surrender      | the garrison become prisoners of "Burgundy"                                                    |
      | storm          | the garrison is killed or taken and "Burgundy" chooses Spare, Plunder or Raze                   |
      | relief         | a French army beats the besiegers and the garrison joins the battle as a reserve with +10 % strength |
      | lifting        | the besiegers leave                                                                            |

  @WAR-170
  Scenario: Breaking terms is an oath broken
    Given "Burgundy" offered honours of war to the garrison of "Troyes" and it accepted
    When "Burgundy" breaks those terms
    Then "Burgundy" counts an oath broken

  @WAR-171 @placeholder
  Scenario Outline: After a storm
    Given "Burgundy" storms the castle of "Troyes"
    When it chooses <choice>
    Then <result>

    Examples:
      | choice  | result                                                                                                          |
      | Spare   | nothing more happens                                                                                            |
      | Plunder | Burgundy gains gold equal to a year of Troyes's tax owed, 1 in 3 town buildings burn, 10 % of townsfolk die or flee, and Troyes gains Burned homes |
      | Raze    | the castle of "Troyes" is destroyed                                                                            |

  @WAR-172 @placeholder
  Scenario Outline: When an AI garrison accepts honours
    Given an AI garrison with <breaches> breaches and <food> of food
    And <relief>
    And the besieging commander <cruel>
    When honours of war are offered
    Then the garrison <answer>

    Examples:
      | breaches | food           | relief                                   | cruel             | answer  |
      | 1        | 6 months       | no relief army is within 10 days         | is not Cruel      | accepts |
      | 0        | 3 weeks        | no relief army is within 10 days         | is not Cruel      | accepts |
      | 1        | 6 months       | a relief army is within 10 days          | is not Cruel      | refuses |
      | 0        | 6 months       | no relief army is within 10 days         | is not Cruel      | refuses |
      | 1        | 6 months       | no relief army is within 10 days         | is Cruel          | refuses |

  @WAR-173 @placeholder
  Scenario Outline: Gold at the gate
    Given a besieged castle whose <condition>
    When the besieger offers its captain gold
    Then the bribe <works>

    Examples:
      | condition                                            | works       |
      | garrison is owed 2 months of pay                     | can work    |
      | lord is wavering                                     | can work    |
      | lord is disloyal                                     | can work    |
      | captain speaks a language different from his ruler's | can work    |
      | garrison is paid and loyal, of its ruler's language  | cannot work |

  @WAR-173
  Scenario: Greedy commanders and bribes
    Given a bribe is offered to a garrison
    When the siege is evaluated
    Then a Greedy commander inside takes it
    And a Greedy commander outside pockets a tenth of it

  @WAR-174 @WAR-164 @WAR-170 @placeholder
  Scenario: Worked example: the castle of Troyes
    Given the castle of "Troyes" is a stone castle with a garrison of 300 and 6 months of store
    And "Burgundy" besieges it with 6000 men and 4 bombards
    Then the castle is closed
    And the besiegers add 8 shot a month
    When 3 months of siege pass
    Then the castle has 1 breach and a walls bonus of about +67 %
    When "Burgundy" offers honours in month 3 and no French relief army is within 10 days
    Then the garrison accepts and marches to "Reims"
    And "Burgundy" takes the castle whole with its castle store and control of food spread in Champagne

  @WAR-198
  Scenario: Sieges update once a month
    Given a siege is running
    When the siege is evaluated
    Then its steps run once at the end of each month

  @WAR-208 @feedback-9
  Scenario: A siege publishes its progress
    Given a castle is besieged
    When the siege changes
    Then its days held, breaches, garrison left and food left are published
