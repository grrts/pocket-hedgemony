@context-diplomacy
Feature: Courting a foreign lord
  As a player
  I want my envoy to work on a wavering lord of another realm
  So that he may come over to me with his land

  @DIPL-128
  Scenario Outline: Only Wavering or Disloyal lords can be courted
    Given the lord "<lord>" of "Austria" is "<loyalty>"
    When the country "Hungary" sends an envoy to court "<lord>"
    Then the courting is <result>

    Examples:
      | lord           | loyalty   | result  |
      | Ulrich of Cilli| Wavering  | started |
      | Ulrich of Cilli| Disloyal  | started |
      | Ulrich of Cilli| Loyal     | refused |

  @DIPL-128 @placeholder
  Scenario Outline: Each season the lord's loyalty drops
    # config: actions.court_lord.loyalty_steps_per_season
    Given the country "Hungary" courts the Wavering lord "Ulrich of Cilli" of "Austria"
    And during the season <counter>
    When the season ends
    Then the loyalty of "Ulrich of Cilli" is "<loyalty>"

    Examples:
      | counter                                                   | loyalty  |
      | nothing happens                                           | Disloyal |
      | "Austria" pays him more with a gift                       | Wavering |
      | "Austria" wins a battle he took part in                   | Wavering |

  @DIPL-129 @placeholder
  Scenario: A courted Disloyal lord on the border defects
    # config: actions.court_lord.defect_after_months, defect_needs_border
    Given the lord "Ulrich of Cilli" of "Austria" is Disloyal and his lands border "Hungary"
    And the country "Hungary" has courted him for 12 months
    When the next month begins
    Then "Ulrich of Cilli" joins "Hungary" with his lands
    And the country "Austria" holds the war aim "Take land" for those provinces

  @DIPL-130 @placeholder
  Scenario: Courting is discovered
    # config: actions.court_lord.discovery_chance_per_season
    Given the country "Hungary" courts a lord of "Austria"
    When the season's 1 in 4 discovery roll comes up
    Then the ledger of "Austria" toward "Hungary" holds "Courted our lord" at -25
    And the envoy is sent home
