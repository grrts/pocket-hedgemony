@context-diplomacy
Feature: Envoys
  As a player
  I want to send officials abroad as envoys who travel and take seats
  So that diplomacy competes with governing for my scarce trained people

  @DIPL-047
  Scenario: An envoy is an official taken from his province
    Given the country "Hungary" has the official "Johann Vitéz", a "Judge" running the province "Bihar"
    When the country "Hungary" sends "Johann Vitéz" as envoy to the country "Venice"
    Then the province "Bihar" is run as if it had no official
    And when the envoy comes home the province "Bihar" has its official again

  @DIPL-048 @placeholder
  Scenario Outline: Envoy seats
    # config: envoys.seats
    Given the country "<country>" has <provinces> provinces
    And the country "<country>" knows the inventions "<inventions>"
    And a national strength of "<country>" adds <strength> seats
    When the game evaluates it
    Then the country "<country>" has <seats> envoy seats

    Examples:
      | country | provinces | inventions | strength | seats |
      | A       | 5         | none       | 0        | 1     |
      | B       | 11        | none       | 0        | 2     |
      | C       | 11        | G5         | 0        | 3     |
      | D       | 11        | G5, G8     | 0        | 4     |
      | E       | 5         | G5, G8     | 1        | 4     |

  @DIPL-049
  Scenario Outline: Falling to 10 provinces loses the size seat, not invention seats
    Given the country "A" has 12 provinces and knows "G5"
    And the country "A" has 3 envoy seats
    When the country "A" falls to <provinces> provinces
    Then the country "A" has 2 envoy seats

    Examples:
      | provinces |
      | 10        |
      | 9         |

  @DIPL-049
  Scenario: Residents beyond the seats are recalled, newest first
    Given the country "A" has 12 provinces and knows "G8"
    And the country "A" has residents in "B" since "1440-01" and in "C" since "1443-01" and an envoy on the road to "D"
    When the country "A" falls to 9 provinces
    Then the resident in "C" is recalled
    And the resident in "B" stays
    And the envoy to "D" finishes its mission

  @DIPL-050
  Scenario: No free seat, no envoy
    Given the country "Hungary" has 2 envoy seats and 2 envoys abroad
    When the country "Hungary" sends an envoy to the country "Poland"
    Then the order is refused for lack of a free seat

  @DIPL-051 @placeholder
  Scenario Outline: Official type bonus
    # config: envoys.official_type_bonus
    Given the envoy is a "<type>"
    When the envoy carries the action "<action>" to a country <faith>
    Then the envoy's reason in the count is <reason>

    Examples:
      | type            | action            | faith              | reason |
      | Judge           | swear peace       | of another faith   | 10     |
      | Judge           | propose alliance  | of another faith   | 0      |
      | Customs officer | ask for passage   | of another faith   | 10     |
      | Chaplain        | propose alliance  | of the same faith  | 10     |
      | Chaplain        | propose alliance  | of another faith   | 0      |
      | Marshal         | propose alliance  | of another faith   | 10     |
      | Warden          | call to arms      | of another faith   | 10     |
      | Muster master   | propose alliance  | of another faith   | 10     |
      | Schoolmaster    | arrange marriage  | of another faith   | 10     |
      | Schoolmaster    | court a lord      | of another faith   | 10     |
      | Master of works | propose alliance  | of another faith   | 0      |

  @DIPL-051 @placeholder
  Scenario Outline: Stewards and tax collectors make gifts count more
    # config: envoys.official_type_bonus.steward.gift_multiplier
    Given the envoy is a "<type>"
    When the envoy carries a gift of 100 gold
    Then the gift counts as <gold> gold

    Examples:
      | type          | gold |
      | Steward       | 125  |
      | Tax collector | 125  |
      | Judge         | 100  |

  @DIPL-052 @placeholder
  Scenario: Years served add to the envoy's reason
    # config: envoys.years_served_bonus
    Given the envoy is a "Marshal" with 10 years served
    When the envoy carries the action "propose alliance"
    Then the envoy's reason in the count is 15

  @DIPL-053 @placeholder
  Scenario: A long resident is trusted at his court
    # config: envoys.resident_years_bonus
    Given the country "Florence" has had a resident at the court of "Venice" for 5 years
    When the country "Florence" asks anything of the country "Venice"
    Then the count has a reason of +5 for the resident's years

  @DIPL-054 @placeholder
  Scenario: Countries without officials send a lord or elder
    # config: envoys.lord_loyalty_step_lost_if_mission_months_over
    Given the country "A" has no officials
    When the country "A" sends the lord "Elder Tamsin" on a mission lasting 13 months
    Then the lord "Elder Tamsin" leaves his lands without his presence
    And the loyalty of "Elder Tamsin" drops a step

  @DIPL-055 @DIPL-056 @placeholder
  Scenario: The road: two days per crossing unit and a month at court
    # config: envoys.days_per_crossing_unit, envoys.months_at_court
    Given the route from the capital of "Hungary" to the capital of "Venice" is 25 crossing units by land
    When the country "Hungary" sends an envoy to the country "Venice"
    Then the envoy arrives after 50 days
    And the envoy stays one month at court
    And the envoy's return date is fixed when it is sent

  @DIPL-055
  Scenario: Sea legs use the naval travel times
    Given the route from "Lisbon" to "London" is by sea
    When the country "Portugal" sends an envoy to the country "England"
    Then the sea legs take the naval sea-zone travel times

  @DIPL-057
  Scenario Outline: Envoys avoid hostile land unless by sea
    Given the only land route from "<from>" to "<to>" crosses the country "<between>"
    And the country "<between>" <status> the country "<from>"
    When the country "<from>" sends an envoy to the country "<to>"
    Then the envoy <route>

    Examples:
      | from    | to     | between  | status                    | route                          |
      | Hungary | Venice | Austria  | is at war with            | goes by sea or cannot be sent  |
      | Hungary | Venice | Austria  | has denied passage to     | goes by sea or cannot be sent  |
      | Hungary | Venice | Austria  | is at peace with          | goes by land                   |

  @DIPL-058 @placeholder
  Scenario Outline: Telegraphy makes missions instant
    # config: envoys.instant_if_both_know, envoys.instant_excludes
    Given the countries "Britain" and "France" both know "T14"
    When the country "Britain" sends the action "<action>" to the country "France"
    Then <outcome>
    And the answer reaches "Britain" a month later

    Examples:
      | action            | outcome                                                  |
      | propose alliance  | it is decided this turn and the envoy never leaves home  |
      | arrange marriage  | the person still travels                                 |
      | make resident     | the person still travels                                 |
      | courtesy visit    | it is decided this turn and the envoy never leaves home  |

  @DIPL-059
  Scenario: An envoy does one task
    Given the envoy "Marshal Kanizsai" is on a mission to "Venice"
    When the country "Hungary" orders "Marshal Kanizsai" to also become resident in "Milan"
    Then the order is refused

  @DIPL-059
  Scenario: A mission is decided on arrival and the envoy comes home
    Given an envoy carries "propose alliance" to the country "Venice"
    When the envoy arrives at the court of "Venice"
    Then the count is made on arrival
    And the envoy travels home afterwards

  @DIPL-060 @DIPL-165
  Scenario Outline: Residents need G8
    Given the date is "1450-01"
    And the country "<country>" <knows> "G8"
    When the country "<country>" makes an envoy resident at the court of "Milan"
    Then the order is <result>

    Examples:
      | country  | knows        | result   |
      | Florence | knows        | accepted |
      | Hungary  | does not know| refused  |

  @DIPL-060 @DIPL-061 @placeholder
  Scenario: The resident tie grows each season and fades after
    # config: ledger.ties.resident_envoy
    Given the country "Florence" has a resident at the court of "Venice"
    When 8 seasons pass
    Then the ledger of "Venice" toward "Florence" holds "Resident envoy" at +30
    And the resident still takes an envoy seat
    When the resident is recalled
    Then "Resident envoy" fades to zero over 5 years

  @DIPL-062
  Scenario: A resident sees the host's court
    Given the country "Florence" has a resident at the court of "Venice"
    And the country "Venice" has 18,350 soldiers and 1,240 gold
    When the game evaluates it
    Then the country "Florence" sees 18,350 soldiers in "Venice"
    And the country "Florence" sees a treasury of 1,200 gold in "Venice"
    And the country "Florence" sees the loyalty of every lord of "Venice"

  @DIPL-063
  Scenario: A resident carries missions without travel
    Given the country "Florence" has a resident at the court of "Venice"
    When the country "Florence" asks the country "Venice" for a trade pact through the resident
    Then the ask arrives this turn with no travel time

  @DIPL-064
  Scenario: A resident warns of war a month ahead
    Given the country "Florence" has a resident at the court of "Milan"
    And the country "Milan" will declare war on the country "Venice", an ally of "Florence", next month
    When the game evaluates it
    Then the country "Florence" is warned now

  @DIPL-065 @placeholder
  Scenario: A courtesy visit
    # config: ledger.ties.courtesy_visit
    Given the diplomacy rules are in force
    When the country "Hungary" makes a courtesy visit to the country "Poland"
    Then the envoy stays one month at court and comes back
    And the ledger of "Poland" toward "Hungary" holds "Courtesy visit" at +15 fading over 5 years

  @DIPL-066 @DIPL-069 @DIPL-070
  Scenario Outline: When an envoy is lost
    Given an envoy of "Hungary" is at the court of "Venice" carrying "<carrying>"
    When <event>
    Then <result>

    Examples:
      | carrying         | event                                                  | result                                                  |
      | propose alliance | the country "Venice" declares war on "Hungary"         | the envoy is held until the peace returns him           |
      | propose alliance | the country "Hungary" declares war on "Venice"         | the envoy is held until the peace returns him           |
      | propose alliance | the official dies of old age on the road               | the seat is free and the mission fails                  |
      | a peace offer    | the war goes on                                        | the envoy is never held                                 |

  @DIPL-067 @placeholder
  Scenario: A demand refused by a Hostile country may cost the envoy
    # config: envoys.held.refused_demand_by_hostile_chance
    Given the stance of "Austria" toward "Hungary" is "hostile"
    And an envoy of "Hungary" carries a demand to "Austria"
    When "Austria" refuses and the 1 in 10 roll comes up
    Then the envoy is held
    And the country "Hungary" holds the war aim "Punish" against "Austria"

  @DIPL-068
  Scenario: A resident flees a court fallen to rebels
    Given the country "Florence" has a resident at the court of "Milan"
    When the country "Milan" falls to rebels
    Then the resident flees home
