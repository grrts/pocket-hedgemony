@context-warfare
Feature: Commander styles
  As a player
  I want commanders to fight in real, named styles of their country and era that spread and go stale
  So that choosing who leads an army is choosing how it fights

  # Config keys: warfare.styles, warfare.styles.region_fallback, warfare.adoption.officers,
  # warfare.adoption.years, warfare.adoption.lessons, warfare.adoption.lessons_years,
  # warfare.adoption.alliance_battles, warfare.style_learn_years

  @WAR-138
  Scenario Outline: A country's own styles
    Given the country "<country>" knows the inventions "<known>"
    When the battle rules are applied
    Then the style "<style>" <is> on its list

    Examples:
      | country      | known        | style          | is         |
      | France       | W2           | Charge en haie | is         |
      | France       | none         | Charge en haie | is not     |
      | Ottomans     | W3           | Tabur cengi    | is         |
      | Poland-Lithuania | W2       | Szarża husarii | is         |
      | England      | none         | Herse          | is         |

  @WAR-139
  Scenario Outline: A new commander takes a style by his origin
    Given the country "Castile" has the horse style "Charge en haie" and the foot style "Three battles"
    When it gets a new commander who is <origin>
    Then he takes the style "<style>"

    Examples:
      | origin                   | style          |
      | a noble                  | Charge en haie |
      | a lord                   | Charge en haie |
      | risen from the ranks     | Three battles  |

  @WAR-139
  Scenario: An academy graduate takes the style the academy teaches
    Given an academy of "Sweden" teaches the style "Swedish brigade"
    When it graduates a commander
    Then he takes the style "Swedish brigade"

  @WAR-140
  Scenario: Hired captains carry their people's style abroad
    Given the country "Milan" hires a Swiss mercenary company with its captain
    When the battle rules are applied
    Then the captain fights in the style "Gewalthaufen"

  @WAR-141
  Scenario Outline: A country with no named style uses its region's
    Given the country "<country>" has no named style of its own in era I
    When the battle rules are applied
    Then it uses the style "<style>" from the config table by culture group

    Examples:
      | country      | style          |
      | Mali         | Furusiyya      |
      | Inca         | Three battles  |

  @WAR-142 @placeholder
  Scenario Outline: Adopting a foreign style
    Given the country "Russia" knows the inventions of the style "Platoon fire"
    When <way>
    Then the style "Platoon fire" is on its list as adopted

    Examples:
      | way                                                                                  |
      | it has hired 3 commanders or captains who use it and 5 years have passed             |
      | an academy is set to teach it with one teacher who knows it                          |
      | it lost 3 battles to it within 10 years                                              |
      | it fought beside an ally using it in 3 battles                                       |
      | it took the capital of a country that uses it                                        |

  @WAR-142
  Scenario: A style can't be adopted without its inventions
    Given the country "Russia" does not know "W11 Flintlock and bayonet"
    When it loses 3 battles to the style "Platoon fire" within 10 years
    Then the style "Platoon fire" is not on its list

  @WAR-143
  Scenario: An adopted style's rule is at half strength in a commander's first battle with it
    Given a commander of "Russia" learns the adopted style "Platoon fire"
    When he fights his first battle in it
    Then its special rule works at half strength

  @WAR-144
  Scenario Outline: Stale styles
    Given a commander in the style "<style>"
    And the enemy has <enemy>
    When the battle rules are applied
    Then his style is <state>

    Examples:
      | style          | enemy                               | state     |
      | Charge en haie | pikes (W6) in the sector charged    | stale     |
      | Charge en haie | W9 Volley fire drill                | stale     |
      | Charge en haie | only levy foot                      | not stale |
      | Gewalthaufen   | W8 massed                           | stale     |
      | Impondo zankomo| W17 with W19                        | stale     |
      | Tercio         | W9 with W8                          | stale     |

  @WAR-144
  Scenario: A stale style loses its rule and an order
    Given the commander of "France" in 1525 fights in the style "Charge en haie" with Cunning 4
    And the Spanish army knows "W9 Volley fire drill"
    When the battle is fought
    Then he has no special rule and 2 orders per bell
    And the battle report says why his style failed

  @WAR-145 @placeholder
  Scenario Outline: How a commander learns a newer style
    Given a commander of "France" in the style "Charge en haie"
    And a newer style "<style>" entered his country's list
    When <event>
    Then he knows the style "<style>"

    Examples:
      | style                | event                                                    |
      | Swedish brigade      | 3 years pass in which he served                          |
      | Swedish brigade      | he graduates from an academy that teaches it             |
      | Swedish brigade      | he loses a battle to it                                  |

  @WAR-145 @placeholder
  Scenario: A second style at 10 victories
    Given a commander who knows one style and has 9 victories
    When he wins a battle
    Then he may know a second style

  @WAR-146 @placeholder
  Scenario Outline: Special rules of styles
    Given a commander in the style "<style>"
    When the battle rules are applied
    Then <rule>

    Examples:
      | style                     | rule                                                                     |
      | Charge en haie            | his Shock charges deal x2.5 instead of x2                                |
      | Three battles             | his reserve adds +5 % break point to the whole army                      |
      | Herse                     | his dug sectors double the first bell's Shot                             |
      | Gewalthaufen              | his pikes advance in the first bell without their charge being reversed by Shock |
      | Wagenburg                 | he can dig in on a day he marched and his dug sectors block Turn and Drive |
      | Sforzesca                 | Commit reserve gives x1.5 hits in the bell it arrives                    |
      | Tabur cengi               | his centre counts as dug in                                              |
      | Shenjiying                | his Shot has no ammunition limit for the first 6 bells                   |
      | Gyorin and Hōshi          | his Turn hits x2 instead of x1.5                                         |
      | Kakuyoku                  | his end sectors get +25 % room                                           |
      | Saka                      | when his army would break it fights one more bell at x1.5                |
      | Xochiyaoyotl              | half of the enemy's killed are taken as prisoners                        |
      | Tercio                    | his companies are Brace and Shot in one and can't Shift                  |
      | Szarża husarii            | his charges are not reversed by Brace in the first contact               |
      | Qizilbash charge          | his charges into Raw companies deal x3                                   |
      | Attaque en règle          | his breaches come x1.5 faster and storming losses are halved             |
      | Schiefe Schlachtordnung   | one end sector gets double room for one bell and Turn from it is x2      |
      | Grande batterie           | all guns fire into one sector for two bells and its defenders are -15 % break point |
      | Kesselschlacht            | an enemy army whose two end sectors are lost can't withdraw and all its men become prisoners when it breaks |
      | Offensive à outrance      | the attacker's flee share is halved                                      |
      | Banzai charge             | breaks are delayed by one bell and losses are x2 for both sides          |
      | Stoßtrupptaktik           | level 4+ companies can Drive through a sector that is still held         |

  @WAR-146
  Scenario: La guerrilla raids the occupier's food
    Given the province "Castile" homeland of "Spain" is occupied by "France" in 1809
    And "Spain" has the style "La guerrilla"
    When the month ends
    Then hidden bands raid the food reserve of the French army there

  @WAR-146
  Scenario: People's war raises rebel bands
    Given a homeland province of a country with the style "People's war" is occupied
    When the month ends
    Then rebel bands form for that country in the province

  @WAR-146
  Scenario: Ganimi kava raids outside battle
    Given a Maratha commander in the style "Ganimi kava" has hidden companies
    When an enemy army marches through
    Then the hidden companies can attack it outside battle, raiding its food reserve

  @WAR-144 @WAR-146
  Scenario: Worked example: Isandlwana and Ulundi, 1879
    Given a Zulu commander in the style "Impondo zankomo"
    When he fights a British thin line spread over many sectors with ammunition far in the camp
    Then from the second bell both British end sectors count as Turned on
    When he later fights a British square that knows "W19 Machine gun" and "W17 Breech-loading rifle"
    Then his style is stale and the horns never reach the ends
