@context-warfare
Feature: Companies and arms
  As the game
  I want every army made of companies that keep their own men, drill, scars and arms
  So that a veteran company and a fresh levy in the same army fight differently

  # Config keys: warfare.company_size_min, warfare.company_size_max, warfare.drill_max, warfare.scars_max,
  # warfare.scar_fade_years, warfare.arms

  @WAR-001 @placeholder
  Scenario: A company has one kind and one arm and its own counts
    Given the army "Royal Army of Champagne" of the country "France"
    When a company of 800 men of kind "levy" and arm "levy foot" is added to it
    Then the company has kind "levy" and arm "levy foot"
    And the company keeps its own men, drill, scars, arms, pay owed and months out

  @WAR-002
  Scenario Outline: Men join and leave a company
    Given a company of 800 men
    When <cause> changes its men by <change>
    Then the company has <result> men

    Examples:
      | cause                         | change | result |
      | refilling from recruits       | 100    | 900    |
      | wounded coming back           | 50     | 850    |
      | enlisting prisoners           | 200    | 1000   |
      | killed in battle              | -100   | 700    |
      | wounded in battle             | -60    | 740    |
      | fleeing                       | -40    | 760    |
      | desertion                     | -40    | 760    |
      | sickness                      | -8     | 792    |
      | hunger                        | -16    | 784    |

  @WAR-003 @placeholder
  Scenario Outline: Drill rises in camp, garrison or winter quarters
    Given a company of kind "<kind>" with drill <before>
    And the company spent the month <where>
    When the month ends
    Then the company has drill <after>

    Examples:
      | kind              | before | where              | after |
      | levy              | 2      | in camp            | 3     |
      | levy              | 2      | in winter quarters | 3     |
      | levy              | 2      | in garrison        | 3     |
      | levy              | 2      | marching           | 2     |
      | levy              | 24     | in camp            | 24    |
      | standing regiment | 5      | marching           | 6     |

  @WAR-004
  Scenario: New men dilute drill and scars
    Given a company of 600 men with drill 10 and scars 4
    When 400 new men refill it
    Then the company has drill 6
    And the company has scars 2.4

  @WAR-005 @placeholder
  Scenario: A hungry month costs drill
    Given a company with drill 6
    When the company has a hungry month
    Then the company has drill 5

  @WAR-006 @placeholder
  Scenario Outline: Scars from standing through a battle
    Given a company with scars <before>
    When the company stands through a battle without breaking and its side <result>
    Then the company has scars <after>

    Examples:
      | before | result | after |
      | 0      | loses  | 1     |
      | 0      | wins   | 2     |
      | 4      | wins   | 5     |
      | 5      | wins   | 5     |

  @WAR-007 @placeholder
  Scenario: Scars fade in a long peace
    Given a company with scars 3
    When 5 years pass without the company fighting a battle
    Then the company has scars 2

  @WAR-008
  Scenario: Disbanding resets drill
    Given a company of kind "levy" with drill 8 and scars 2
    When the company is disbanded
    Then its drill and scars are reset

  @WAR-009
  Scenario Outline: Loads of arms a company carries
    Given a company of 1000 men of arm "armoured foot" carrying 10 loads of arms
    When <event>
    Then the company carries <loads> loads of arms

    Examples:
      | event                                               | loads |
      | it captures 3 loads on a won field                  | 13    |
      | 200 of its men are killed                           | 8     |
      | it leaves 5 loads on a lost field                   | 5     |

  @WAR-010
  Scenario: A company short of arms fights as the next arm down
    Given a company of 1000 men of arm "armoured foot" carrying 4 loads of arms
    When the company fights in a battle
    Then the company fights as arm "levy foot"

  @WAR-011 @placeholder
  Scenario Outline: Arms have a strength, needs, roles and an unlock
    Given the arm "<arm>"
    When the warfare config is read
    Then its strength per man is <strength>
    And it needs "<needs>" per 100 men
    And its roles are "<roles>"
    And it is unlocked by "<unlock>"

    Examples:
      | arm                 | strength | needs                                   | roles             | unlock                         |
      | levy foot           | 1.0      | nothing                                 | Line              | start                          |
      | armoured foot       | 1.3      | 1 load of arms                          | Line, Heavy       | start                          |
      | archers             | 1.1      | 1 load of arms                          | Shot              | start                          |
      | pikes               | 1.2      | 1 load of arms                          | Brace             | W6 Pike squares                |
      | hand gunners        | 1.4      | 1 load of arms, 1 powder a battle       | Shot              | W5 Gunpowder infantry          |
      | pike and shot       | 1.6      | 2 loads of arms, 1 powder               | Brace, Shot       | W7 Pike and shot               |
      | musketeers          | 2.0      | 2 arms, 2 powder                        | Shot              | W9 Volley fire drill           |
      | line infantry       | 2.6      | 2 arms, 2 powder                        | Line, Brace, Shot | W11 Flintlock and bayonet      |
      | light horse         | 2.0      | 100 horses                              | Shock, Light      | start                          |
      | horse archers       | 2.5      | 100 horses, 1 arms                      | Shot, Light       | W1 Composite-bow horse archery |
      | knights and lancers | 3.5      | 100 horses, 50 remounts, 2 arms         | Shock, Heavy      | W2 Heavy armoured cavalry      |
      | field guns          | 25       | 15 crew, 6 horses, 2 powder a battle    | Guns              | W8 Field artillery             |
      | light field guns    | 25       | 10 crew, 4 horses, 2 powder a battle    | Guns              | W13 Light field artillery      |
      | bombards            | 5        | 20 crew, 8 horses or oxen, 1 powder a month firing | Guns   | W3 Bombards                    |

  @WAR-012 @placeholder
  Scenario Outline: Elephants and camels are their own troop types
    Given the arm "<arm>"
    When the warfare config is read
    Then its strength per man is <strength>
    And its roles are "<roles>"
    And <special>

    Examples:
      | arm            | strength | roles        | special                                                       |
      | war elephants  | 6.0      | Shock, Heavy | it fights at -50 % in forest and jungle with 8 men to an elephant |
      | camel riders   | 2.0      | Shock, Light | it takes no desert penalty and needs 100 camels per 100 men   |

  @WAR-012
  Scenario: Camel riders are known at start in desert and Sahel realms
    Given the country "Mali" is a Sahel realm in 1444
    When the warfare config is read
    Then the country "Mali" can field the arm "camel riders"

  @WAR-013
  Scenario: No powder, no guns
    Given the country "Burgundy" has 0 loads of powder in its powder store
    And its army has 8 bombards and 1000 hand gunners
    When the army fights a battle
    Then its bombards and hand gunners do not fire

  @WAR-013 @placeholder
  Scenario: Guns take powder from the store
    Given the country "Burgundy" has 20 loads of powder in its powder store
    And its army has 1000 hand gunners
    When the army fights a battle
    Then the country "Burgundy" has 10 loads of powder in its powder store

  @WAR-014
  Scenario: Later-era arms follow the same table
    Given the arm "tanks" in config
    When the warfare config is read
    Then it has a strength per man, needs and an unlocking invention like every other arm
