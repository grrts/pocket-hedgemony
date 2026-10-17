@context-warfare
Feature: Warfare through the eras
  As the game
  I want each realm to fight by the inventions it knows, with battle scale, troop types, levels and skills changing by era
  So that armies from different eras can meet on one field, from 1444 to 31 August 1939

  # Era VIII (1960 on) is out of scope; era VII ends at 31 August 1939.
  # Config keys: warfare.hits_per_bell, warfare.room_by_era, warfare.battle.max_days, warfare.levels_by_era,
  # warfare.might_by_era, warfare.cunning_by_era, warfare.logistics_by_era

  @WAR-147
  Scenario: Armies from different eras on one field
    Given the country "Britain" knows the inventions of era VI
    And the Zulu kingdom knows no W inventions
    When they fight a battle in 1879
    Then each side fights with the troop types, style forms and skill rules of the inventions it knows

  @WAR-148 @placeholder
  Scenario Outline: Battle scale by era
    Given a battle fought in era <era> by realms that know <inventions>
    When the rules of its era are applied
    Then a bell is <bell>
    And the longest battle is <days> days
    And sector room is <room> of the sector table
    And hits per bell are <hits> of the front

    Examples:
      | era | inventions    | bell       | days | room      | hits |
      | I   | none          | 2 hours    | 3    | all       | 4 %  |
      | IV  | W11           | 2 hours    | 3    | all       | 4 %  |
      | V   | W16           | 2 hours    | 3    | all       | 5 %  |
      | V   | W17           | 2 hours    | 3    | all       | 6 %  |
      | VI  | W17           | half a day | 10   | half      | 6 %  |
      | VI  | W19           | half a day | 10   | half      | 8 %  |
      | VII | W21           | a day      | 30   | a quarter | 8 %  |

  @WAR-149
  Scenario Outline: Obsolete arms fight at half strength against an enemy who knows the replacement
    Given a company of arm "<arm>"
    And the enemy knows "<invention>"
    When the rules of its era are applied
    Then the company fights at half strength

    Examples:
      | arm                        | invention                  |
      | knights and lancers        | W9 Volley fire drill       |
      | pikes                      | W11 Flintlock and bayonet  |
      | archers                    | W9 Volley fire drill       |
      | horse archers              | W11 Flintlock and bayonet  |
      | bombards                   | W8 Field artillery         |
      | line infantry              | W17 Breech-loading rifle   |
      | armoured foot              | W5 Gunpowder infantry      |

  @WAR-149
  Scenario: Cavalry stays as Light after the machine gun
    Given a light horse company
    And the enemy knows "W19 Machine gun"
    When the rules of its era are applied
    Then it is obsolete as Shock but still fights as Light

  @WAR-149
  Scenario: Horse archers keep scouting and raiding when obsolete
    Given the country "Crimea" has horse archers
    And its enemy knows "W11 Flintlock and bayonet"
    When the rules of its era are applied
    Then the horse archers still scout and raid

  @WAR-149
  Scenario: Obsolete arms fight normally against an enemy who lacks the invention
    Given a company of arm "pikes"
    And the enemy does not know "W11 Flintlock and bayonet"
    When the rules of its era are applied
    Then the company fights at full strength

  @WAR-150
  Scenario: Obsolete arms can't be raised once your own realm knows the replacement
    Given the country "Prussia" knows "W11 Flintlock and bayonet"
    When the rules of its era are applied
    Then the country "Prussia" cannot raise the arm "pikes"
    But its existing pike companies can still be fielded

  @WAR-151
  Scenario: Re-arming costs arms and powder and a level
    Given a pike company of level 3
    When it re-arms to "pike and shot"
    Then its loads of arms and powder for the new arm are taken from the stores
    And its level is 2

  @WAR-152 @placeholder
  Scenario Outline: Drill months for levels by era
    Given a company of the country "France" in era <era>
    When the rules of its era are applied
    Then it needs <drilled>, <seasoned> and <elite> months of drill for Drilled, Seasoned and Elite

    Examples:
      | era | drilled | seasoned | elite |
      | I   | 2       | 4        | 8     |
      | II  | 3       | 6        | 12    |
      | III | 4       | 8        | 12    |
      | IV  | 6       | 12       | 18    |
      | V   | 3       | 6        | 18    |
      | VI  | 6       | 12       | 24    |
      | VII | 6       | 12       | 24    |

  @WAR-152 @placeholder
  Scenario Outline: Level worth by era
    Given a company of the country "France" in era <era>
    When the rules of its era are applied
    Then its hits bonus at levels 1 to 5 is <hits>
    And its break point bonus at levels 3 to 5 is <break>

    Examples:
      | era | hits                         | break            |
      | I   | -10 / 0 / +10 / +20 / +30 %  | +5 / +10 / +15 % |
      | II  | -10 / 0 / +10 / +20 / +30 %  | +5 / +10 / +15 % |
      | III | -15 / 0 / +15 / +25 / +35 %  | +5 / +10 / +15 % |
      | IV  | -20 / 0 / +15 / +30 / +45 %  | +5 / +10 / +20 % |
      | V   | -15 / 0 / +15 / +25 / +40 %  | +5 / +10 / +20 % |
      | VI  | -25 / 0 / +20 / +35 / +50 %  | +10 / +15 / +20 % |
      | VII | -30 / 0 / +25 / +45 / +70 %  | +10 / +15 / +25 % |

  @WAR-153
  Scenario Outline: Era notes on levels
    Given <situation>
    When the rules of its era are applied
    Then <rule>

    Examples:
      | situation                                                      | rule                                                     |
      | a knight company is raised in era I                            | it starts at level 3                                     |
      | a levy company in era I has drill and scars for level 4        | it stays at level 3 unless it becomes standing troops    |
      | a pike and shot company is level 1 in era II                   | it fights as levy foot                                   |
      | a musketeer company is level 1 in era III with W9              | it shoots at half                                        |
      | a line infantry company is level 1 in era IV                   | it can't change sector in a bell                         |
      | a realm with W18 calls up former soldiers in era VI            | they come at level 2                                     |
      | a level 4 company fights in era VII                            | it can infiltrate                                        |

  @WAR-154
  Scenario: A new invention drops a company a level until it drills again
    Given the country "France" has a musketeer company of level 3
    When "France" learns "W11 Flintlock and bayonet"
    Then the company's level is 2
    And it regains the level after drilling the new era's Drilled months

  @WAR-155 @placeholder
  Scenario Outline: Might by era
    Given a commander with Might 2 in era <era>
    When the rules of its era are applied
    Then <effect>

    Examples:
      | era | effect                                                                                 |
      | I   | the men in his sector get +16 % hits and +6 % break point, and he has a 1 in 5 risk if the sector is lost |
      | II  | the men in his sector get +14 % hits and +6 % break point                                |
      | IV  | the men in his sector get +10 % hits and +4 % break point                                |
      | V   | the men in his sector get +8 % hits and +4 % break point, and he has a 1 in 10 risk if the sector is lost |
      | VI  | the whole army gets +6 % hits and +2 % break point, and he is at risk only if the camp is taken |
      | VII | the whole army gets +4 % hits and +2 % break point, and his Drive orders get +20 %       |

  @WAR-156 @placeholder
  Scenario Outline: Cunning by era
    Given a commander with Cunning <cunning> in era <era> whose realm knows <inventions>
    When the rules of its era are applied
    Then he has <orders> orders per bell

    Examples:
      | era | cunning | inventions | orders |
      | I   | 1       | none       | 1      |
      | I   | 3       | none       | 2      |
      | I   | 5       | none       | 2      |
      | II  | 5       | none       | 3      |
      | V   | 4       | W14        | 4      |
      | VI  | 0       | W17        | 2      |
      | VII | 4       | W23        | 5      |

  @WAR-156
  Scenario Outline: Messengers in early eras
    Given a commander in era <era> gives an order to a sector <distance> sectors from his own
    When the rules of its era are applied
    Then the order arrives <when>

    Examples:
      | era | distance | when          |
      | I   | 1        | next bell     |
      | II  | 2        | the same bell |
      | II  | 3        | next bell     |
      | IV  | 5        | the same bell |

  @WAR-156
  Scenario: Captains give their own orders from era VI
    Given a battle in era VI
    When the rules of its era are applied
    Then captains give their own orders in their sectors

  @WAR-157 @placeholder
  Scenario Outline: Logistics by era
    Given a commander with Logistics 2 in era <era>
    When the rules of its era are applied
    Then <effect>

    Examples:
      | era | effect                                                                          |
      | I   | his bowmen shoot 6 bells before refilling                                       |
      | II  | his Shot shoots 5 bells before refilling                                        |
      | V   | his Shot and guns shoot 4 bells and his guns need powder wagons in the camp     |
      | VI  | his companies have 3 bells of ammunition, fight at half without it, and up to 4 sectors rotate for free |
      | VII | his tanks and aircraft have fuel for 3 bells, then stop, and depth replaces 20 % of losses per bell |

  @WAR-158 @placeholder
  Scenario Outline: How skills grow by era
    Given a commander in era <era>
    When <event>
    Then he gains +1 <skill>

    Examples:
      | era | event                                                          | skill     |
      | III | he is trained at an academy                                    | Might     |
      | IV  | he serves as a captain under a Cunning 4 commander             | Cunning   |
      | VI  | he spends a peacetime year in wargames for the first time this era | Cunning |
      | VI  | he graduates from a staff college                              | Logistics |
      | VI  | he commands a standing army a year in peace with fewer than 3 such gains | Logistics |
      | VI  | he wins his 4th victory since his last Might from victories    | Might     |

  @WAR-144 @WAR-155
  Scenario: Worked example: a French noble commander, three times
    Given a French commander in the style "Charge en haie"
    When he fights the English style "Herse" at Formigny in 1450 and the French have culverins
    Then the Herse is stale and his charge finishes the archers
    When he fights the Swiss "Gewalthaufen" at Marignano in 1515 with massed French guns
    Then the Gewalthaufen is stale and his charges break the pikes
    When he fights the Spanish "Tercio" with arquebusiers knowing W9 in wooded ground at Pavia in 1525
    Then his style is stale, he loses an order per bell and his knights are shot down
