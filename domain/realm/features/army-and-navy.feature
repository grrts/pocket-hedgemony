@context-realm
Feature: Army and navy summary
  As a player
  I want soldiers, recruits, horses, ships, castles, commanders and the fallen counted for the realm
  So that I know what I can field and what war has cost

  @REALM-090
  Scenario Outline: Soldiers are raised and lost
    Given the country "France" has 22,000 soldiers
    When <cause>
    Then its soldiers are <direction>

    Examples:
      | cause                                    | direction |
      | it raises recruits for gold              | more      |
      | it hires a paid company                  | more      |
      | a lord brings his retinue                | more      |
      | a battle kills men                       | fewer     |
      | disease and hunger strike on campaign    | fewer     |
      | it leaves pay owed and men desert        | fewer     |
      | it disbands a company                    | fewer     |

  @REALM-090
  Scenario: Soldiers cost gold every month and eat grain
    Given the country "France" has 22,000 soldiers
    When a month passes
    Then it pays them gold
    And they eat grain

  @REALM-091
  Scenario Outline: Recruits refill and are spent
    Given the country "France" has 48,000 recruits
    When <cause>
    Then its recruits are <direction>

    Examples:
      | cause                                            | direction |
      | the year's refill comes from its royal provinces | more      |
      | students leave school                            | more      |
      | it raises soldiers                               | fewer     |
      | it sends young men to school                     | fewer     |
      | famine strikes                                   | fewer     |
      | plague strikes                                   | fewer     |

  @REALM-092
  Scenario: Horses cap the horsemen
    Given the country "France" has 6,000 horses
    When it tries to field 8,000 horsemen
    Then it can field at most as many horsemen as its horses allow

  @REALM-092
  Scenario Outline: Horses come and go
    Given the country "Poland" has 6,000 horses
    When <cause>
    Then its horses are <direction>

    Examples:
      | cause                                     | direction |
      | its grassland breeds them                 | more      |
      | it buys from steppe traders               | more      |
      | it captures them                          | more      |
      | a battle kills them                       | fewer     |
      | fodder runs short                         | fewer     |
      | disease strikes them                      | fewer     |

  @REALM-093
  Scenario Outline: Ships
    Given the country "Portugal" has 12 warships and 60 trade ships
    When <cause>
    Then its <kind> are <direction>

    Examples:
      | cause                                   | kind        | direction |
      | it builds in a port                     | warships    | more      |
      | it captures an enemy ship               | warships    | more      |
      | a storm sinks some                      | trade ships | fewer     |
      | they rot without upkeep                 | warships    | fewer     |
      | a sea battle sinks some                 | warships    | fewer     |

  @REALM-094
  Scenario Outline: Castles
    Given the country "France" has 31 castles
    When <cause>
    Then it has <count> castles

    Examples:
      | cause                                  | count |
      | it builds one                          | 32    |
      | it conquers one                        | 32    |
      | a siege destroys one                   | 30    |
      | a peace demolishes one                 | 30    |

  @REALM-095
  Scenario Outline: Commanders
    Given the country "France" has 4 named commanders with Might, Cunning and Logistics
    When <cause>
    Then it has <count> commanders

    Examples:
      | cause                                  | count |
      | it hires one                           | 5     |
      | its heir takes command                 | 5     |
      | a captain is promoted after a victory  | 5     |
      | one dies in battle                     | 3     |
      | one dies of old age                    | 3     |
      | one is captured                        | 3     |

  @REALM-096 @placeholder
  Scenario: The fallen of the last ten years
    # config: fallen.window_years; OQ-REALM-12 on window or fade
    Given the country "France" lost 31,000 soldiers in battles and sieges in the last 10 years
    When the player opens its card
    Then it shows "Fallen (10 yrs) 31,000"
    And its people and lords lean toward peace
    And its recruits refill more slowly
