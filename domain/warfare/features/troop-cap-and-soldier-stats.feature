@context-warfare
Feature: The realm's soldiers and troop cap
  As a player
  I want my realm's soldiers, stores, prisoners, victories and troop cap counted
  So that officials, castles, forges and powder mills are part of military strength

  # Config keys: warfare.troop_cap.with_official, warfare.troop_cap.muster_master, warfare.troop_cap.without,
  # warfare.troop_cap.w12, warfare.troop_cap.w15, warfare.troop_cap.w18, warfare.over_cap.pay,
  # warfare.over_cap.desertion, warfare.arms_rust, warfare.powder_damp, warfare.victories_window_years

  @WAR-024
  Scenario: Soldiers include garrisons
    Given the country "France" has 14200 men in armies and 3000 men in garrisons
    When the troop cap and soldiers are counted
    Then the country "France" has 17200 soldiers

  @WAR-025 @placeholder
  Scenario Outline: The arms store
    Given the country "France" has 100 loads of arms in its arms store
    When <event>
    Then the country "France" has <loads> loads of arms in its arms store

    Examples:
      | event                                      | loads |
      | its forges make 20 loads                   | 120   |
      | a disbanded company hands back 10 loads    | 110   |
      | 25 loads are issued to a company           | 75    |
      | a year of rust passes                      | 98    |

  @WAR-026 @placeholder
  Scenario Outline: The powder store
    Given the country "France" has 100 loads of powder in its powder store
    When <event>
    Then the country "France" has <loads> loads of powder in its powder store

    Examples:
      | event                                          | loads |
      | its powder mills make 10 loads                 | 110   |
      | a year of damp passes                          | 95    |
      | a castle magazine of 30 loads is captured      | 70    |

  @WAR-027 @placeholder
  Scenario: Prisoners eat
    Given the country "France" holds 300 prisoners
    When the month ends
    Then 300 rations are eaten by its prisoners

  @WAR-028 @placeholder
  Scenario: Victories count over 20 years
    Given the country "France" won 6 battles in 1440 and 2 in 1455
    When the date is 1461
    Then the country "France" has 2 victories

  @WAR-029 @placeholder
  Scenario: France's troop cap in 1444
    Given the country "France" has 4000000 people in royal provinces with an official
    And 1500000 people in royal provinces without one
    And it has 31 castles
    When the troop cap and soldiers are counted
    Then the troop cap of "France" is 95000 plus the garrison room of its 31 castles

  @WAR-029 @placeholder
  Scenario: A muster master counts 3 % instead of 2 %
    Given a royal province of 100000 people with a muster master
    When the troop cap and soldiers are counted
    Then it adds 3000 to the troop cap

  @WAR-030
  Scenario Outline: What counts toward the troop cap
    Given the country "France" has a company of kind "<kind>"
    When the troop cap and soldiers are counted
    Then the company <counts> toward the troop cap of "France"

    Examples:
      | kind              | counts                              |
      | levy              | counts                              |
      | hired company     | counts                              |
      | standing regiment | counts                              |
      | retinue           | does not count                      |
      | garrison          | counts only above its castle's room |

  @WAR-031
  Scenario: Occupied and revolting provinces count nothing
    Given the royal province "Champagne" with an official is occupied by "Burgundy"
    When the troop cap and soldiers are counted
    Then "Champagne" adds nothing to the troop cap of "France"

  @WAR-032 @placeholder
  Scenario Outline: Inventions raise the troop cap
    Given a royal province of 100000 people with an official
    And the country knows "<invention>"
    When the troop cap and soldiers are counted
    Then it adds <cap> to the troop cap

    Examples:
      | invention                   | cap  |
      | none                        | 2000 |
      | W12 Standing regiments      | 2500 |
      | W15 Mass conscription       | 4000 |
      | W18 Railway mobilization    | 3000 |

  @WAR-033 @placeholder
  Scenario: The Duke of Burgundy's own cap
    Given the lord "Duke of Burgundy" holds 6 provinces in France with about 430000 people, all with his officials
    When the troop cap and soldiers are counted
    Then his retinue cap is about 9000
    And his retinue does not count toward the troop cap of "France"

  @WAR-034
  Scenario: Allies count on their own cap
    Given the country "Scotland" is an ally of "France" with an army in France
    When the troop cap and soldiers are counted
    Then that army counts toward the troop cap of "Scotland" and not of "France"

  @WAR-035 @placeholder
  Scenario: Over the cap
    Given the country "France" has 5000 more soldiers counting toward its troop cap than the cap allows
    When the troop cap and soldiers are counted
    Then the country "France" cannot raise or hire anyone
    And each of the 5000 soldiers over the cap costs double pay
    And its levies desert 5 % a month until it is back under the cap

  @WAR-036
  Scenario: One army has no size cap
    Given the country "France" is under its troop cap
    When it joins all its armies into one army of 60000 men
    Then the army is allowed
