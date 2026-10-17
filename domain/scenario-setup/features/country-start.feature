@context-scenario-setup
Feature: Country starting values
  As the game
  I want each country's starting counts to follow its historical assessments and relations
  So that France starts rich and divided and Venice starts with ships and traders

  @SETUP-020 @open-question
  # OQ-SETUP-6: no numbers per level are given
  Scenario Outline: Assessments set starting counts
    Given the record "<record>" has the assessment "<dimension>" at "<level>"
    When the starting world is built
    Then its starting "<stat>" follows that level

    Examples:
      | record | dimension               | level     | stat                                       |
      | france | economic_strength       | very_high | Gold and Debt                              |
      | france | manpower_potential      | very_high | Recruits                                   |
      | france | military_capability     | high      | Soldiers, Commanders and Horses            |
      | venice | naval_capability        | very_high | Ships                                      |
      | france | administrative_capacity | high      | Officials and royal provinces              |
      | france | territorial_cohesion    | low       | number of lords, their land, and Tongue    |
      | venice | institutional_development | very_high | Schools, Scholars and starting inventions |
      | venice | trade_access            | very_high | Merchants and grain price access           |
      | france | diplomatic_influence    | very_high | extra officials at court for envoys        |
      | france | political_stability     | moderate  | lords' starting loyalty and provinces in revolt |

  @SETUP-021 @SETUP-020
  Scenario: Low confidence widens the starting range
    Given the record "silesia" has low confidence
    And the record "france" has high confidence
    When the starting world is built with several different seeds
    Then Silesia's starting counts vary over a wider range than France's

  @SETUP-022
  Scenario: Starting allies, rivals, subjects and enemies come from the relations file
    Given the relations file for 11 November 1444 with 280 relations and 19 facts
    When the starting world is built
    Then each country's allies, rivals, subjects and enemies are those in the relations file

  @SETUP-023
  Scenario Outline: Lords come from the great houses
    Given the country "<country>" holds <provinces> provinces
    When the starting world is built
    Then it starts with <lords>

    Examples:
      | country             | provinces | lords                                         |
      | France              | 52        | the great houses its history names            |
      | a one-province count | 1        | no lords                                      |

  @SETUP-024 @placeholder
  Scenario Outline: Starting traders follow trade access
    Given a country whose "trade_access" is "<level>"
    When the starting world is built
    Then it starts with <traders> traders

    Examples:
      | level     | traders |
      | very_high | 6       |
      | high      | 4       |
      | moderate  | 2       |
      | low       | 1       |
      | very_low  | 0       |
      | unknown   | 0       |

  @SETUP-024
  Scenario Outline: Coastal countries trade by ship and inland ones by land
    Given the country "<country>" is <where>
    When its starting traders are placed
    Then they are <kind>

    Examples:
      | country | where                       | kind                     |
      | Venice  | coastal with ports          | trade ships              |
      | Mali    | inland                      | caravans                 |

  @SETUP-025 @placeholder @open-question
  # OQ-SETUP-12: does the warm-up use the seed or move the date
  Scenario: Busy roads start busy
    Given the starting traders and their routes
    When the starting world is built
    Then the traders are run for 24 months before the first turn
    And the trade ratios they leave are the starting ratios

  @SETUP-026
  Scenario: Faiths come from the catalogue
    Given the record "delhi" with a Sunni court over a Hindu majority
    When the starting world is built
    Then Delhi's ruler's faith is Sunni and its people's majority faith is Hindu

  @SETUP-027
  Scenario Outline: Four realms can explore from the first day
    Given the country "<country>"
    When the starting world is built
    Then it <can> explore on the first turn

    Examples:
      | country  | can      |
      | Portugal | can      |
      | Castile  | can      |
      | Genoa    | can      |
      | Venice   | can      |
      | Ming     | can't    |
