@context-religion
Feature: The faith mix
  As the game
  I want every faith to pull on a province's people through visible causes, and the mix to drift slowly toward the pulls
  So that conversion takes generations and every change has a named reason

  @RELG-009 @RELG-010 @RELG-011 @RELG-012 @RELG-013 @RELG-014 @placeholder
  Scenario Outline: Sources of pull
    # config key: pull
    Given the province "Testshire" has <source> of the faith "catholic"
    When the year's pulls are worked out
    Then "catholic" gets <pull> pull from it in "Testshire"

    Examples:
      | source                                              | pull |
      | a step-2 church at least half filled with clergy    | 1.5  |
      | a fallow step-2 church                              | 0.75 |
      | a stationed preacher                                | 2    |
      | a cathedral school                                  | 0.5  |
      | the ruler's capital, the ruler being catholic       | 1    |
      | a lord of that faith holding the province           | 0.5  |

  @RELG-015 @placeholder
  Scenario Outline: Islam carried by trade
    # config keys: pull.traders_per_100, pull.traders_max
    Given <traders> traders pass through "Kilwa" each year from markets where "sunni" is the majority
    When the year's pulls are worked out
    Then "sunni" gets <pull> pull from traders in "Kilwa"

    Examples:
      | traders | pull |
      | 100     | 0.5  |
      | 300     | 1.5  |
      | 600     | 2    |

  @RELG-015
  Scenario: Only faiths carried by trade gain from traders
    Given 300 catholic traders pass through "Bruges" each year
    When the year's pulls are worked out
    Then "catholic" gets no pull from traders in "Bruges"

  @RELG-017 @RELG-018 @RELG-019 @placeholder
  Scenario Outline: The ruler's faith gains from policy and Chaplains
    # config keys: pull.restricted_escape_tax, pull.chaplain_multiplier, pull.persecution_multiplier
    Given the country "Castile" has the state faith "catholic"
    And the province "Valencia" has 2 step-1 catholic chapels and no preacher
    And <condition>
    When the year's pulls are worked out
    Then "catholic" has <pull> pull in "Valencia"

    Examples:
      | condition                                          | pull |
      | nothing else                                       | 2    |
      | sunni is Restricted and lives in "Valencia"        | 3    |
      | a Chaplain official serves in "Valencia"           | 4    |
      | sunni is Persecuted and lives in "Valencia"        | 4    |

  @RELG-020 @RELG-021 @placeholder @open-question
  Scenario: One year's move
    # OQ-RELG-2: shares as fractions
    # config keys: mix.hold_per_share, mix.drift_per_year
    Given the province "Testshire" is half "catholic" and half "protestant"
    And "catholic" has 3 pull and "protestant" has 1 pull
    When a year ends
    Then the target share of "catholic" is 0.625
    And the share of "catholic" becomes 0.50375

  @RELG-020 @RELG-021 @placeholder @open-question
  Scenario: East Bengal, 1444–1700
    # OQ-RELG-2: the example's target is the settled point
    Given the date is 1444
    And the province "East Bengal" is 70 % hindu, 25 % asian_traditional and 5 % sunni
    And the province "East Bengal" has 2 hindu temples and a sunni lord
    And the ruler of "East Bengal" is "sunni"
    When the forest is cleared and a mosque is granted on each of 3 new field tiles
    Then "sunni" has 3.5 pull, "hindu" 2 and "asian_traditional" 1
    And the mix settles toward sunni 54 %, hindu 31 % and asian_traditional 15 %
    And once "asian_traditional" falls below a quarter it loses its sacred-places pull
    And by about 1700 "East Bengal" is mostly "sunni"

  @RELG-021
  Scenario: Hold slows change but never stops it
    Given the province "Testshire" has one faith with three houses and another with one, nothing else pulling
    When many years pass
    Then the province ends up about three to one

  @RELG-022
  Scenario: Nothing moves without a cause
    Given no faith in the province "Testshire" has any pull
    When a year ends
    Then the mix of "Testshire" is unchanged

  @RELG-023 @placeholder
  Scenario Outline: A small faith vanishes
    # config key: mix.vanish_below
    Given the faith "jewish" is <share> of "Testshire"
    And it <house> a house of its own there
    When a year ends
    Then "jewish" <outcome> in "Testshire"

    Examples:
      | share | house        | outcome       |
      | 0.009 | has no       | disappears    |
      | 0.009 | has          | stays         |
      | 0.011 | has no       | stays         |

  @RELG-024 @open-question
  Scenario Outline: A fourth faith arrives
    # OQ-RELG-17: culture's rule differs
    Given the province "Testshire" holds catholic 70 %, protestant 25 % and jewish 5 %
    When <share> of "sunni" people arrive
    Then "sunni" <outcome>

    Examples:
      | share | outcome                           |
      | 6 %   | replaces "jewish" among the three |
      | 4 %   | does not enter the mix            |

  @RELG-025 @placeholder
  Scenario Outline: Hidden believers
    # config keys: mix.hidden_believers_floor, mix.hidden_believers_years
    Given the faith "catholic" is Persecuted in "Japan" and its houses in "Nagasaki" closed <years> years ago
    And <inquisition>
    When the pulls would push "catholic" below 2 % in "Nagasaki"
    Then "catholic" <outcome>

    Examples:
      | years | inquisition                 | outcome                     |
      | 40    | no Inquisition runs          | stays at 2 % in "Nagasaki"  |
      | 100   | no Inquisition runs          | may fall below 2 %          |
      | 40    | an Inquisition runs there    | may fall below 2 %          |

  @RELG-026
  Scenario: Movers shift the mix at once
    Given the province "Tetouan" is wholly sunni
    When 5,000 sunni refugees and 1,000 jewish refugees settle in "Tetouan"
    Then the mix of "Tetouan" shifts by their headcount at once, outside the pulls

  @RELG-027
  Scenario: Every change has a named reason
    When the player opens the Faith line of a province
    Then each faith's pull is listed with its sources
