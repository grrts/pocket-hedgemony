@context-warfare
Feature: Commanders and captains
  As a player
  I want commanders whose Might, Cunning and Logistics grow and fade by what they do
  So that choosing who leads an army is a real decision

  # Config keys: warfare.might_victories_per_point, warfare.age.might_from, warfare.age.cunning_from,
  # warfare.age.step_years, warfare.wound_chance.lost, warfare.wound_chance.won, warfare.death_chance.loser,
  # warfare.traits, warfare.second_trait_victories, warfare.their_man.victories, warfare.their_man.years,
  # warfare.captain_learns_style_wins

  @WAR-049
  Scenario: The commander card of Jean de Dunois
    Given the commander "Jean de Dunois" of the country "France"
    When the commander is evaluated
    Then he has Might 3, Cunning 4 and Logistics 2
    And he has the style "Three battles" and the trait "Careful"
    And he has 6 victories, 1 defeat, 1 wound and age 47

  @WAR-050 @placeholder
  Scenario Outline: Might grows with victories
    Given a commander with Might <before> and <victories> victories
    When he <wins>
    Then he has Might <after>

    Examples:
      | before | victories | wins                                    | after |
      | 2      | 1         | wins a battle                           | 3     |
      | 2      | 2         | wins a battle                           | 2     |
      | 2      | 2         | wins a battle while outnumbered         | 3     |
      | 5      | 1         | wins a battle                           | 5     |

  @WAR-051 @placeholder
  Scenario Outline: Might fades with wounds and age
    Given a commander with Might 4 aged <age>
    When <event>
    Then he has Might <after>

    Examples:
      | age | event                          | after |
      | 40  | he takes a serious wound       | 3     |
      | 64  | he turns 65                    | 3     |
      | 58  | he turns 59                    | 4     |

  @WAR-052
  Scenario Outline: Cunning grows from outthinking the enemy
    Given a commander with Cunning 2
    When <event>
    Then he has Cunning 3

    Examples:
      | event                                                                   |
      | he wins a battle in which he gave more orders than the enemy commander |
      | he makes a clean withdrawal from a lost battle                          |

  @WAR-053 @placeholder
  Scenario Outline: Cunning fades
    Given a commander with Cunning 3 aged <age>
    When <event>
    Then he has Cunning <after>

    Examples:
      | age | event                              | after |
      | 69  | he turns 70                        | 2     |
      | 40  | he is ambushed and loses           | 2     |

  @WAR-054 @placeholder
  Scenario Outline: Logistics grows
    Given a commander with Logistics 1
    When <event>
    Then he has Logistics 2

    Examples:
      | event                                                             |
      | he spends a full year in the field without a hungry month         |
      | he takes command after years as a steward official               |

  @WAR-055
  Scenario: Logistics fades when an army starves under him
    Given a commander with Logistics 3
    When his army spends a month at no food
    Then he has Logistics 2

  @WAR-055
  Scenario: Logistics fades with age past 65
    Given a commander with Logistics 3 aged 66
    When he ages further
    Then his Logistics can fall

  @WAR-056
  Scenario: An academy graduate starts with a bonus and no victories
    Given an academy trains a commander
    When the commander is evaluated
    Then he starts with +1 Cunning or +1 Logistics
    And he has 0 victories

  @WAR-057 @placeholder
  Scenario Outline: Wound chances
    Given a commander with trait "<trait>"
    When his army <result> a battle
    Then his chance of a serious wound is <chance>

    Examples:
      | trait    | result | chance   |
      | Careful  | loses  | 1 in 10  |
      | Careful  | wins   | 1 in 20  |
      | Reckless | loses  | 1 in 5   |
      | Reckless | wins   | 1 in 10  |

  @WAR-058 @placeholder
  Scenario Outline: Trait effects
    Given a commander with trait "<trait>"
    When the commander is evaluated
    Then <effect>

    Examples:
      | trait        | effect                                                                               |
      | Steady       | his army's break point is +5 %                                                       |
      | Reckless     | his army has +10 % strength, -5 % break point and losses x1.3 for both sides         |
      | Careful      | he is never ambushed while marching Careful and spots hidden companies as with +1 Cunning |
      | Beloved      | desertion in his army is halved and levies stay 3 months longer                      |
      | Cruel        | sacks pay 50 % more and enemy garrisons won't accept his terms                       |
      | Siege master | his breaches come 25 % faster                                                        |
      | Horse lord   | his Shock is +10 % and his Turn orders with Shock give hits x2                        |
      | Old soldier  | drill of his companies rises 2 a month                                               |
      | Greedy       | he keeps a tenth of all loot and takes bribes from garrisons                         |

  @WAR-058
  Scenario: A Cruel occupier burns homes faster
    Given a commander with trait "Cruel" occupies the province "Champagne"
    When the commander is evaluated
    Then "Champagne" gains Burned homes faster than under another commander

  @WAR-059 @placeholder
  Scenario: A second trait at 10 victories
    Given a commander with trait "Steady" and 9 victories
    When he wins a battle
    Then he may gain a second trait

  @WAR-060
  Scenario Outline: Traits set default standing orders
    Given an army whose player has not set its standing orders
    And its commander has trait "<trait>"
    When the commander is evaluated
    Then its standing order "retreat if outnumbered" is "<ratio>"

    Examples:
      | trait    | ratio  |
      | Reckless | never  |
      | Careful  | 3 to 2 |

  @WAR-061
  Scenario Outline: Where commanders come from
    Given the country "France" gets a commander by origin "<origin>"
    When the commander is evaluated
    Then the catch is "<catch>"

    Examples:
      | origin                | catch                                                                   |
      | the ruler or an heir  | his death or capture can start a succession crisis                      |
      | a lord                | he may refuse to serve under a lower-born commander                     |
      | a hired captain       | he leaves when unpaid, like his company                                 |
      | risen from the ranks  | Proud lords waver when he commands them                                 |
      | an academy graduate   | he starts with +1 Cunning or Logistics and no victories                 |
      | an exile              | his old ruler sees it as an insult                                      |
      | a commissioned official | he counts as an academy graduate: +1 Cunning or Logistics and no victories |

  @WAR-061
  Scenario: Risen from the ranks is offered once per won battle
    Given the army of "France" wins a battle
    When the commander is evaluated
    Then the player is offered one company captain who stood to promote to commander

  @WAR-062 @placeholder
  Scenario Outline: Losing commanders
    Given the commander "Jean de Dunois" leads an army
    When <event>
    Then the country "France" loses him as a commander

    Examples:
      | event                                                     |
      | his army loses a battle and he is killed (1 in 20)        |
      | he is captured                                            |
      | he dies of old age                                        |
      | he is dismissed                                           |
      | he defects with his army                                  |

  @WAR-062
  Scenario: A commander granted land leads only his retinue
    Given the commander "Jean de Dunois" is granted land as a new lord
    When the commander is evaluated
    Then he leads only his own retinue

  @WAR-062
  Scenario: A dismissed lord wavers
    Given the lord "Duke of Bourbon" commands an army of "France"
    When he is dismissed
    Then the lord "Duke of Bourbon" wavers

  @WAR-063 @placeholder
  Scenario: Captains stand in sectors and learn the style
    Given the army "Royal Army of Champagne" with commander "Jean de Dunois" in style "Three battles"
    And captains "Duke of Bourbon" and "Count of Foix"
    When the captain "Duke of Bourbon" has won 3 battles under him
    Then the captain "Duke of Bourbon" knows the style "Three battles"
    And the army cannot take a third captain

  @WAR-064 @placeholder
  Scenario: A general grows too big
    Given a commander with 8 victories who has led the same standing regiments for 5 years
    Then those regiments follow him before the crown
    When the ruler of his country is a child
    Then events can offer him the throne or a march on the capital

  @WAR-065
  Scenario: Women commanders follow each country's history
    Given a country whose history has women commanders
    When the commander is evaluated
    Then a woman can be its commander
    And women commanders become more likely in later eras

  @WAR-209 @feedback-13
  Scenario: No army without a commander
    Given soldiers stand in a province with no commander
    Then they are the province's garrison troops, not an army

  @WAR-209 @feedback-13
  Scenario Outline: An army that loses its commander
    Given an army whose commander is killed and which has no captain
    And it stands in <land>
    Then <result>

    Examples:
      | land                  | result                                                   |
      | its own realm's land  | it becomes the garrison troops of that province          |
      | foreign land          | it halts and waits there until a commander joins it      |
