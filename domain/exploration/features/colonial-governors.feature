@context-exploration
Feature: Colonial governors and colonial range
  As a player or AI country
  I want to hire colonial governors up to my slots and found colonies within my colonial range
  So that colonies are planted by named people, one at a time, chaining outward across an ocean

  @EXPL-024
  Scenario Outline: S5 opens colonial governors
    Given the country "Castile" <knows> S5 "ocean_navigation"
    When the country "Castile" tries to hire a colonial governor
    Then the hire is <result>

    Examples:
      | knows         | result  |
      | knows         | allowed |
      | does not know | refused |

  @EXPL-025 @placeholder
  Scenario: A colonial governor is hired like any official, and is a person
    # config: exploration.governor_hire_gold, exploration.governor_wage_per_year, exploration.governor_age_when_hired
    Given the country "Castile" knows S5 "ocean_navigation" and has a free colonial governor slot
    When the country "Castile" hires a colonial governor in the port "Seville"
    Then the country "Castile" pays 20 gold for him and 5 gold a year in wages
    And the governor waits in the port "Seville", aged 30
    And after a year he is 31
    And he can die of old age, which frees his slot

  @EXPL-026 @placeholder
  Scenario Outline: Colonial governor slots
    # config: exploration.governor_slots
    Given the country "Castile" knows <inventions>
    When the game counts its colonial governor slots
    Then the country "Castile" has <slots> colonial governor slots

    Examples:
      | inventions    | slots |
      | S5            | 2     |
      | S5 and T8     | 3     |
      | S5, T8 and T9 | 4     |

  @EXPL-026
  Scenario: Slots are never lost
    Given the country "Castile" has 4 colonial governor slots
    When the country "Castile" loses provinces in a war
    Then the country "Castile" still has 4 colonial governor slots

  @EXPL-027
  Scenario: No free slot, no governor
    Given the country "Castile" has 2 colonial governor slots and 2 colonial governors
    When the country "Castile" tries to hire a colonial governor
    Then the hire is refused

  @EXPL-028
  Scenario Outline: How a colonial governor leaves his slot
    Given the country "Castile" has a colonial governor "Diego de Arana" holding slot 1 of 2
    When <event>
    Then <result>

    Examples:
      | event                                | result                                                       |
      | his colony is founded                | he becomes the colony's ordinary official and his slot frees |
      | his colony is lost                   | he dies and his slot frees                                   |
      | he dies of old age                   | his slot frees                                               |
      | the country "Castile" dismisses him  | his slot frees                                               |

  @EXPL-029
  Scenario: A governor holding a slot is not counted against the officials cap
    Given the country "Castile" has as many officials as its officials cap allows
    When the country "Castile" hires a colonial governor into a free slot
    Then the hire is allowed
    And the number of officials counted against the cap of the country "Castile" does not change

  @EXPL-030
  Scenario: A governor waits in port until any ship picks him up
    Given the colonial governor "Diego de Arana" waits in the port "Seville"
    When a Castilian carrack in the port "Seville" takes him aboard
    Then the governor travels aboard the carrack
    But the carrack carries no colony stores for him

  @EXPL-031 @placeholder
  Scenario Outline: Colonial range by government form
    # config: exploration.range_by_form (owned by government)
    Given the country "<country>" has the government form "<form>"
    When the game reads its colonial range
    Then the country "<country>" has a colonial range of <range> zones

    Examples:
      | country  | form              | range |
      | Castile  | feudal realm      | 20    |
      | Portugal | feudal realm      | 20    |
      | Venice   | merchant republic | 30    |
      | Ottomans | household realm   | 10    |
      | Uri      | peasant commune   | 0     |

  @EXPL-032 @placeholder
  Scenario Outline: Inside or outside the colonial range
    Given the country "Castile" has a colonial range of 20 zones
    And the coastal zone of a colonisable province is <zones> zones from the nearest Castilian port or colony
    When the country "Castile" tries to found a colony there
    Then founding is <result>

    Examples:
      | zones | result  |
      | 17    | allowed |
      | 20    | allowed |
      | 21    | refused |

  @EXPL-033
  Scenario: Colonies chain across an ocean
    Given the country "Castile" has a colonial range of 20 zones
    And a province is 35 zones from the nearest Castilian port
    And the country "Castile" founds a colony 17 zones from its port and 18 zones from that province
    When the country "Castile" tries to found a colony in that province
    Then founding is allowed

  @EXPL-031
  Scenario: Portugal reaches Brazil from the Cape Verde islands
    Given the country "Portugal" has a colonial range of 20 zones
    And the coast of Brazil is about 10 zones from a Portuguese port in the Cape Verde islands
    When the country "Portugal" tries to found a colony on an unowned coast of Brazil
    Then founding is allowed

  @EXPL-026 @EXPL-009 @placeholder
  Scenario Outline: T8 and T9 add to the S3 slot too
    # config: exploration.governor_slots
    Given the country "Hawaii" knows <inventions>
    When the game counts its colonial governor slots
    Then the country "Hawaii" has <slots> colonial governor slots

    Examples:
      | inventions    | slots |
      | S3            | 1     |
      | S3 and T8     | 2     |
      | S3, T8 and T9 | 3     |
      | S3 and S5     | 2     |

  @EXPL-058
  Scenario: A colony already being founded keeps going when the range shrinks
    Given the country "Castile" founds a colony 17 zones from its nearest port with a colonial range of 20
    When its government form changes to "household realm" with colonial range 10
    Then the colony is still being founded
    But a new colony 17 zones away is refused

  @EXPL-065
  Scenario Outline: What colonial range is measured from
    Given the country "Castile" has <place> 5 zones from an unowned coast
    And no other port or colony of the country "Castile" is within 20 zones of it
    When the country "Castile" with a colonial range of 20 tries to found a colony on that coast
    Then founding is <result>

    Examples:
      | place                                         | result  |
      | a port of its own                             | allowed |
      | a port held by one of its lords               | allowed |
      | a canoe landing of its own                    | allowed |
      | a port of its subject "Canarian lordship"     | allowed |
      | a colony it founded                           | allowed |
      | a colony it is still founding                 | refused |
