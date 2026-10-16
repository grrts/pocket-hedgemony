@context-exploration
Feature: Unlocking exploration
  As a player or AI country
  I want exploration to open when I have the ships and my region has reached the Age of Exploration
  So that ocean voyages start where and when history allows

  @EXPL-001 @EXPL-003
  Scenario Outline: Who can explore in 1444
    Given the date is 1444
    And the age "age_of_exploration" has begun in the region of the country "<country>"
    And the country "<country>" <knows> S4 "Carrack and caravel"
    When the game checks the exploration unlock for the country "<country>"
    Then the country "<country>" <result> the exploration unlock

    Examples:
      | country  | knows         | result     |
      | Portugal | knows         | has        |
      | Castile  | knows         | has        |
      | Genoa    | knows         | has        |
      | Venice   | knows         | has        |
      | Ming     | does not know | lacks      |

  @EXPL-001
  Scenario: Ming must research S4 first
    Given the country "Ming" knows S1 and S2 but not S4
    And the age "age_of_exploration" has begun in the region "east_asia"
    When the country "Ming" learns S4 "Carrack and caravel"
    Then the country "Ming" has the exploration unlock

  @EXPL-001 @EXPL-007
  Scenario: Outrigger voyaging is the Pacific and Malay way
    Given a country of the region "oceania" knows S3 "Outrigger voyaging" and not S4
    And the age "age_of_exploration" has begun in the region "oceania"
    When the game checks its exploration unlock
    Then it has the exploration unlock
    And its exploration ships are voyaging canoes

  @EXPL-002
  Scenario: The age gate stays open after the age ends
    Given the age "age_of_exploration" began in the region "europe" in 1444
    And the age "age_of_exploration" ended in 1620
    And the country "Denmark" learns S4 "Carrack and caravel" in 1650
    When the game checks the exploration unlock for the country "Denmark"
    Then the country "Denmark" has the exploration unlock

  @EXPL-004 @open-question
  Scenario: A region outside the age cannot explore yet
    # depends on OQ-EXPL-3: which later age opens the gate is not set
    Given the region "middle_east" is not in the region list of the age "age_of_exploration"
    And the country "Mamluk Sultanate" of the region "middle_east" knows S4 "Carrack and caravel"
    When the game checks the exploration unlock for the country "Mamluk Sultanate"
    Then the country "Mamluk Sultanate" lacks the exploration unlock

  @EXPL-005
  Scenario Outline: No unlock, no exploration ships
    Given the country "<country>" lacks the exploration unlock
    When the country "<country>" orders a "<ship>"
    Then the order is refused

    Examples:
      | country | ship           |
      | Ming    | caravel        |
      | England | caravel        |

  @EXPL-006
  Scenario Outline: Early voyages creep along the coasts
    Given the country "Portugal" has the exploration unlock
    And the country "Portugal" knows <research>
    When its caravel plans a voyage into an ocean zone <distance> zones from a coast
    Then the voyage is <result>

    Examples:
      | research      | distance | result  |
      | S1 and S4     | 3        | allowed |
      | S1 and S4     | 4        | refused |
      | S1, S4 and S5 | 12       | allowed |

  @EXPL-007 @placeholder
  Scenario: A voyaging canoe
    # config: naval.ships, exploration.colony_stores
    Given a country knows S3 "Outrigger voyaging"
    And it holds a shore tile with seafolk and no harbour
    When it orders a voyaging canoe there
    Then the canoe needs 20 sailors, 5 gold, 1 timber and 1 month
    And the canoe carries 60 supply and 100 rations of colony stores

  @EXPL-008
  Scenario: A voyaging canoe crosses open ocean from the start
    Given the date is 1444
    And a country knows S3 "Outrigger voyaging" but not S1 or S5
    When its voyaging canoe plans a voyage across open ocean
    Then the voyage is allowed

  @EXPL-009 @placeholder
  Scenario Outline: S3 opens colonies whatever the government form
    # config: exploration.governor_slots, exploration.s3_min_range
    Given a country knows S3 "Outrigger voyaging" and not S5
    And its government form is "<form>" with colonial range <form_range>
    When the game counts its colonial governors and range
    Then it has 1 colonial governor slot
    And its colonial range is <range> zones

    Examples:
      | form               | form_range | range |
      | chiefdom           | 0          | 10    |
      | paramount chiefdom | 5          | 10    |
      | merchant republic  | 30         | 30    |
