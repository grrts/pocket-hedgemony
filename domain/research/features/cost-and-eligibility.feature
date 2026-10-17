@context-research
Feature: What can be studied and what it costs
  As a player or AI country
  I want clear rules for what I may study and how many scholar-years it costs
  So that I can plan my climb up the tree

  @RSCH-030 @placeholder
  Scenario Outline: Cost by era
    # config: research.era_cost
    Given the date is <date>
    When the country "France" studies an invention of era <era>
    Then it costs <cost> scholar-years before discounts

    Examples:
      | date | era | cost |
      | 1450 | I   | 20   |
      | 1550 | II  | 40   |
      | 1650 | III | 80   |
      | 1750 | IV  | 150  |
      | 1850 | V   | 250  |
      | 1900 | VI  | 400  |
      | 1920 | VII | 650  |

  @RSCH-031 @RSCH-032 @placeholder
  Scenario Outline: Studying ahead costs double per era
    # config: research.ahead_multiplier
    Given the date is <date>
    When the country "Venice" studies an invention of era <era>
    Then it costs <cost> scholar-years before discounts

    Examples:
      | date | era | cost |
      | 1490 | I   | 20   |
      | 1490 | II  | 80   |
      | 1490 | III | 320  |
      | 1510 | II  | 40   |

  @RSCH-033
  Scenario Outline: Parent, also needs and "or"
    Given the country "<country>" knows <known>
    When it tries to study "<invention>"
    Then the study is <result>

    Examples:
      | country | known                                                  | invention                     | result  |
      | England | C12 Coke smelting and L11 experimental_science         | C13 steam_power               | allowed |
      | England | C12 Coke smelting only                                 | C13 steam_power               | refused |
      | Korea   | F2 Wet-rice terracing but not F1 Three-field rotation  | F7 Ever-normal granaries      | allowed |
      | Mali    | L1 and L2 Madrasa networks but not L5 printing         | L7 Universities               | allowed |
      | Venice  | L5 printing                                            | L6 humanist_learning          | allowed |
      | Portugal | S1 Magnetic compass and sea charts only               | S4 Carrack and caravel        | refused |

  @RSCH-034 @placeholder
  Scenario Outline: Spread from neighbours and trade partners
    # config: research.spread_per_partner, research.spread_cap
    Given <partners> neighbours or trade partners of "Hungary" know "L5 printing"
    When "Hungary" studies "L5 printing" in its own era
    Then it costs <cost> scholar-years

    Examples:
      | partners | cost |
      | 0        | 20   |
      | 1        | 18   |
      | 3        | 14   |
      | 6        | 8    |
      | 9        | 8    |

  @RSCH-035
  Scenario: Contact inventions need a contact event
    Given the country "Castile" knows the bough "Tilling and building"
    And it has made no Atlantic crossing
    When it tries to study "F9 Maize, potato and cassava"
    Then the study is refused
    When the Atlantic crossing contact event happens for "Castile"
    Then it may study "F9 Maize, potato and cassava"

  @RSCH-036 @RSCH-074 @RSCH-069 @placeholder
  Scenario Outline: Inventions that change research itself
    # config: inventions[].effects (research_pct, spread_pct, school_upkeep_pct, old_age_one_in)
    Given the country "Venice" learns "<invention>"
    When research is next worked out
    Then <effect>

    Examples:
      | invention                       | effect                                                         |
      | C1 Paper making                 | school upkeep is 10 % lower                                    |
      | L4 Metal movable type           | school upkeep is 10 % lower                                    |
      | L5 printing                     | each partner takes 12 % off and school upkeep is 10 % lower    |
      | L6 humanist_learning            | research is 10 % higher                                        |
      | L3 Observatories                | Learning and Sea inventions get 20 % more research             |
      | L10 Spectacles and telescopes   | 1 in 60 scholars is lost to old age each year instead of 1 in 30 |
      | L11 experimental_science        | research is 10 % higher                                        |
      | L14 Encyclopedias               | each partner takes 12 % off                                    |
      | L20 Research laboratories       | research is 50 % higher                                        |
      | L21 Radio                       | each partner takes 12 % off                                    |

  @RSCH-069 @placeholder
  Scenario: Spread inventions add up but the cap stays
    # config: research.spread_per_partner_pct, inventions[].effects.spread_pct
    Given the country "Venice" knows L5 printing, L14 Encyclopedias and L21 Radio
    When 3 neighbours or trade partners of "Venice" know an invention of its own era
    Then each partner takes 16 % off
    And the invention costs 52 % of its era cost
    And with 5 such partners it costs 40 % of its era cost

  @RSCH-077
  Scenario: The Atlantic crossing comes from exploration
    Given the invention tree config
    When the tree is loaded
    Then "F9 Maize, potato and cassava" opens on the contact event "atlantic_crossing"
    And the country "Aztecs" knows "F9 Maize, potato and cassava" from the start
