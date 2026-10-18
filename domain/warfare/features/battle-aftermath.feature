@context-warfare
Feature: Battle: night, aftermath, prisoners, standing orders and reports
  As a player
  I want to know what a battle cost both sides and to read or watch it afterwards
  So that I can follow wars in short sessions

  # Config keys: warfare.after.wounded_return, warfare.after.fled_return, warfare.after.pursuit,
  # warfare.after.camp_share, warfare.capture_chance, warfare.prisoner_enlist_level, warfare.capture_warfare_realms

  @WAR-123 @placeholder
  Scenario Outline: Withdrawing at night
    Given no army has broken after 6 bells
    And the army of "Burgundy" withdraws by its standing orders
    And its commander has Cunning <burgundy> and the enemy commander Cunning <france>
    When the battle is resolved
    Then the withdrawal is <result>

    Examples:
      | burgundy | france | result                                       |
      | 4        | 4      | clean, with no pursuit                       |
      | 5        | 4      | clean, with no pursuit                       |
      | 2        | 4      | counted as breaking, with half the pursuit   |

  @WAR-124
  Scenario: Overnight, fled men return and ammunition refills
    Given night falls in a battle
    When the battle is resolved
    Then the fled men who will come back return to their companies
    And ammunition is refilled

  @WAR-125 @placeholder
  Scenario Outline: The wounded after a battle
    Given a battle ends with 300 wounded on the side that <side>
    When the battle is resolved
    Then <result>

    Examples:
      | side           | result                                                                       |
      | holds the field| 200 return to their companies after 5 weeks if the army is fed and 100 die |
      | broke          | 300 become the winner's prisoners                                            |

  @WAR-126 @placeholder
  Scenario Outline: The fled after a battle
    Given a battle ends with 400 fled on the side that <side>
    When the battle is resolved
    Then <result>

    Examples:
      | side            | result                                                                            |
      | holds the field | 200 return within 2 weeks and 200 go home to recruits                             |
      | broke           | 200 return if the army reaches a friendly castle and 200 go home to recruits      |

  @WAR-127 @placeholder
  Scenario: Pursuit
    Given the side that holds the field has 2000 Shock and Light men who didn't break
    And the broken side has at least 500 fleeing men
    When the pursuit is made
    Then 500 fleeing men are killed or taken prisoner

  @WAR-128
  Scenario Outline: The winner takes arms and the camp
    Given a battle where the broken side's camp <camp>
    When the battle is resolved
    Then the field-holder picks up the arms of the loser's killed and wounded
    And the field-holder takes <share> of the loser's wagons and food reserve

    Examples:
      | camp                      | share |
      | was not taken             | half  |
      | was taken by Drive        | all   |

  @WAR-129 @placeholder
  Scenario: Leaders of the broken side may be captured
    Given the army of "Burgundy" broke with its commander and 2 captains
    When the battle is resolved
    Then each of them has a 1 in 10 chance of capture, more if pursued

  @WAR-130
  Scenario: Records after a battle
    Given the army of "France" under "Jean de Dunois" holds the field against "Burgundy"
    When the battle is resolved
    Then "Jean de Dunois" and "France" gain a victory
    And the Burgundian commander and "Burgundy" gain a defeat
    And French companies that didn't break gain 2 scars
    And Burgundian companies that broke gain no scar

  @WAR-131
  Scenario: The killed are Fallen
    Given 700 French soldiers are killed in a battle
    When the battle is resolved
    Then the Fallen of "France" rise by 700

  @WAR-132
  Scenario Outline: What to do with prisoners
    Given the country "France" holds a Burgundian prisoner
    When France chooses to <choice>
    Then <result>

    Examples:
      | choice   | result                                                         |
      | ransom   | Burgundy pays gold by the prisoner's rank                      |
      | exchange | a French prisoner held by Burgundy comes home                  |
      | release  | the prisoner goes home, a gift that wins goodwill              |
      | enlist   | the prisoners become a hired company at level 1                |
      | hold     | the prisoner stays and eats a ration a month                   |

  @WAR-133 @placeholder
  Scenario: Capture warfare
    Given the Mesoamerican country "Tlaxcala" has capture warfare
    When its army kills 400 enemy soldiers in a battle
    Then 200 of them are taken as prisoners instead

  @WAR-134
  Scenario Outline: Standing orders: retreat if outnumbered
    Given an army of <ours> men with standing order "retreat if outnumbered <ratio>"
    And an enemy army of <theirs> men arrives
    When the battle is resolved
    Then before the battle the army <wants>

    Examples:
      | ours  | theirs | ratio  | wants                |
      | 8000  | 14200  | 3 to 2 | wants to retreat     |
      | 8000  | 14200  | 2 to 1 | does not want to retreat |
      | 7000  | 14200  | 2 to 1 | wants to retreat     |
      | 7000  | 14200  | never  | does not want to retreat |

  @WAR-134
  Scenario: Retreat if outnumbered is checked each night
    Given a battle reaches night
    When the battle is resolved
    Then each army checks its standing order "retreat if outnumbered" again

  @WAR-134
  Scenario Outline: Attack or wait
    Given an army with standing order "<order>"
    And an enemy army comes into a neighbouring province
    When the battle is resolved
    Then the army <does>

    Examples:
      | order  | does                         |
      | attack | marches on the enemy army    |
      | wait   | stays put                    |

  @WAR-135
  Scenario: Battles are resolved one at a time in the turn
    Given three battles were fought in the turn
    When the turn ends
    Then each battle is resolved one at a time, in order
    And each result is ready before its report shows

  @WAR-136
  Scenario: A player battle is fought round by round
    Given the player's country "France" fights a battle at "Troyes" this turn
    When the battle is fought one round at a time
    Then it ends with the same result as the battle fought at once
    And at each round the player can "change standing orders", "retreat" or "switch battle", and there is no Skip to result
    And after the battle a report names who fought, where, the result, the losses and the one-line reason
    And the battle can be replayed later from its report

  @WAR-205
  Scenario: A side can retreat at any round
    Given the player's country "France" fights a battle at "Troyes" this turn
    When "France" orders a retreat after round 2
    Then the battle ends in round 3 with "France" withdrawing

  @WAR-206
  Scenario: An army that marches in joins a running battle
    Given the player's country "France" fights a battle at "Troyes" this turn
    When a French army of 2000 men marches in after round 1
    Then the French side has 4600 men in the battle

  @WAR-137
  Scenario: Battles between other countries don't stop the turn
    Given "Castile" and "Portugal" fought a battle this turn and the player is "France"
    When the turn ends
    Then the turn does not stop
    And the battle report waits in the log

  @WAR-202
  Scenario: The battle playback says what each commander did
    Given the player watches the battle at "Troyes"
    When the battle is resolved
    Then each bell shows a line such as "Dunois commits his knights to the pastures"

  @WAR-203
  Scenario Outline: Notifications for short sessions
    Given <event>
    When the battle is resolved
    Then the player gets a notification "<notice>"

    Examples:
      | event                                        | notice                    |
      | the player's army loses a battle             | battle lost, with its one-line reason |
      | a breach opens in a castle the player besieges | a breach               |
      | terms are offered to the player              | terms offered             |
      | the player's peace voices pass half          | peace voices passing half |
      | pay is owed to the player's army             | pay owed                  |
      | the player's army is hungry                  | an army hungry            |
