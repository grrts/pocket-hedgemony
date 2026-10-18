@context-national-strengths
Feature: Hidden ambitions
  As a player
  I want secret goals that I learn by reading the world
  So that each campaign has its own direction

  @HER-014 @HER-015 @placeholder
  Scenario: Drawing ambitions at the start
    Given the country "Castile" has a pool of 6 ambitions, 2 tagged historical
    When the campaign starts
    Then 3 ambitions are drawn
    And at least one of them is tagged historical

  @HER-016 @HER-017
  Scenario: A sealed ambition
    Given the country "Venice" has the sealed ambition with hint "The Visconti line is ending; the river is a border only by habit."
    When the player opens the heritage card
    Then the ambition shows a theme icon and the hint
    And its plain goal is not shown

  @HER-018
  Scenario: The seal cracks
    Given the country "Venice" has a sealed ambition
    When its stir condition holds
    Then the ambition is stirred
    And it shows a warmth, the name of the legacy it promises and its deadline
    And the hint stays the only words shown

  @HER-019
  Scenario: An ambition done
    Given the country "Portugal" has the stirred ambition "Beyond the Cape of Storms"
    When "Portugal" holds "Calicut"
    Then the legacy "Estado da Índia" is granted
    And the plain goal is shown for the first time
    And a new ambition is drawn from the pool

  @HER-020
  Scenario Outline: An ambition lost
    Given the country "Portugal" has the open ambition "Beyond the Cape of Storms" with a window ending in 1560
    When <cause>
    Then the ambition is lost without penalty
    And its plain goal is shown as what might have been
    And a new ambition is drawn

    Examples:
      | cause                         |
      | the year 1561 begins          |
      | its fail condition holds      |

  @HER-021
  Scenario Outline: Warmth
    Given an ambition's goal has <leaves> leaf conditions
    And <held> of them hold
    When the heritage conditions are evaluated
    Then its warmth is "<warmth>"

    Examples:
      | leaves | held | warmth |
      | 3      | 0    | cold   |
      | 3      | 1    | warm   |
      | 3      | 2    | hot    |
      | 3      | 3    | done   |
      | 4      | 3    | hot    |

  @HER-021 @placeholder
  Scenario: A count leaf counts as partly met
    Given an ambition's goal is a single count leaf of 12 markets
    And the country has 8 markets
    When the heritage conditions are evaluated
    Then the goal counts as two thirds met

  @HER-022
  Scenario: A yes-or-no goal
    Given an ambition's goal is a single holds_place condition
    When the place is taken
    Then the warmth goes from cold straight to done

  @HER-023
  Scenario: No free wins
    Given a drawn ambition's goal already holds on 11 Nov 1444
    When the campaign starts
    Then the ambition is put back and another is drawn

  @HER-024 @placeholder
  Scenario Outline: Counsel
    Given the date is in era <era>
    And the country "Venice" last paid counsel <since> years ago
    When "Venice" asks for counsel on one ambition
    Then <result>

    Examples:
      | era | since | result                                                        |
      | I   | 10    | it pays 30 gold and the ambition stirs and shows its warmth   |
      | IV  | 12    | it pays 120 gold and the ambition stirs and shows its warmth  |
      | VII | 11    | it pays 380 gold and the ambition stirs and shows its warmth  |
      | II  | 6     | counsel is refused                                            |

  @HER-025 @placeholder
  # config: ambitions.envoy_reveal_years
  Scenario: Reading a rival through a resident envoy
    Given the country "Milan" has kept a resident envoy at the court of "Venice"
    When 2 years have passed
    Then "Milan" learns the hint and warmth of one active ambition of "Venice"
    And never its plain goal

  @HER-026
  Scenario: Age ambitions
    Given the pool of "England" has an entry naming the "age_of_atlantic_empires"
    When the "age_of_atlantic_empires" begins
    Then the entry joins the pool of "England"

  @HER-027
  Scenario Outline: History mode setting
    Given the campaign setting "History mode" is "<mode>"
    When ambitions are drawn
    Then <result>
    And no setting reveals ambitions

    Examples:
      | mode            | result                                        |
      | Drawn           | 3 are drawn with one historical guaranteed    |
      | Historical only | only ambitions tagged historical are drawn    |

  @HER-028
  Scenario: The tutorial ambition
    Given the player starts the tutorial
    When the tutorial teaches ambitions
    Then it uses one ambition whose hint is plain

  @HER-069 @placeholder
  Scenario: The AI knows its own ambitions
    Given the AI country "Milan" has 3 active ambitions
    When the AI chooses its goals
    Then it sees its ambitions' plain goals
    And weighs them at 1.5 next to its ai_personality priorities
    And when it completes one it gets the legacy

  @HER-014 @placeholder
  Scenario Outline: Pool size
    # config: ambitions.pool_min_generated, ambitions.pool_max
    Given a generated heritage with <pool> ambitions in its pool and <age> age ambitions
    When heritage is built
    Then its pool is <verdict>

    Examples:
      | pool | age | verdict           |
      | 3    | 0   | too small         |
      | 4    | 0   | within the limits |
      | 7    | 2   | within the limits |
      | 8    | 0   | too large         |

  @HER-079 @placeholder
  Scenario: The AI puts its weakest heyday to sleep
    # config: ai.sleep_heyday
    Given the AI country "Milan" has 2 heydays awake worth 3 and 2 points
    When a third heyday worth 2.5 points would wake
    Then the AI puts the heyday worth 2 points to sleep
    And 2 heydays are awake

  @HER-079 @placeholder
  Scenario: The AI lets its weakest legacy go
    # config: ai.let_go_legacy
    Given the AI country "Milan" holds 5 legacies, the weakest worth 0.5 points
    When it earns a sixth worth 2 points
    Then the AI lets the legacy worth 0.5 points go
    And "Milan" still holds 5 legacies

  @HER-078
  Scenario: Heritage counts time month by month
    Given the country "Portugal" has a heyday awake in an active age
    When 300 months pass with its wakes condition holding
    Then the heyday has served 25 years
