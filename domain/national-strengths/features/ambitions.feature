@context-national-strengths
Feature: Ambitions
  As a player
  I want clear goals whose rewards I discover by reaching them
  So that each campaign has its own direction

  @HER-014 @HER-015 @placeholder
  Scenario: Drawing ambitions at the start
    Given the country "Castile" has a pool of 6 ambitions, 2 tagged historical
    When the campaign starts
    Then 3 ambitions are drawn
    And at least one of them is tagged historical

  @HER-016 @HER-017
  Scenario: An open ambition shows its goal, not its reward
    Given the country "Portugal" has the open ambition "Beyond the Cape of Storms"
    When the player opens the heritage card
    Then the ambition shows its name, its plain goal and its progress
    And it names its promised legacy "Estado da Índia" as a great legacy
    And what the legacy gives is not shown

  @HER-018
  Scenario Outline: Progress
    Given an ambition's goal is <goal>
    And <state>
    When the heritage conditions are evaluated
    Then its progress is <have> of <need>

    Examples:
      | goal                               | state                              | have | need |
      | a count of 12 markets              | the country has 8 markets          | 8    | 12   |
      | 3 places that must all be held     | the country holds 2 of them        | 2    | 3    |
      | one of 2 places                    | the country holds neither          | 0    | 1    |
      | one of a count of 12 markets or a place | the country has 8 markets     | 8    | 12   |

  @HER-019
  Scenario: An ambition done
    Given the country "Portugal" has the open ambition "Beyond the Cape of Storms"
    When "Portugal" holds "Calicut"
    Then the legacy "Estado da Índia" is granted
    And what the legacy gives is shown for the first time
    And a new ambition is drawn from the pool

  @HER-020
  Scenario Outline: An ambition lost
    Given the country "Portugal" has the open ambition "Beyond the Cape of Storms" with a window ending in 1560
    When <cause>
    Then the ambition is lost without penalty
    And what the legacy gives is not shown
    And a new ambition is drawn

    Examples:
      | cause                         |
      | the year 1561 begins          |
      | its fail condition holds      |

  @HER-021
  Scenario Outline: Within reach
    Given an ambition's goal has <leaves> leaf conditions
    And <held> of them hold
    When the heritage conditions are evaluated
    Then the ambition is <verdict>

    Examples:
      | leaves | held | verdict          |
      | 3      | 1    | not within reach |
      | 3      | 2    | within reach     |
      | 4      | 3    | within reach     |
      | 3      | 3    | done             |

  @HER-021 @placeholder
  Scenario: A count leaf counts as partly met
    Given an ambition's goal is a single count leaf of 12 markets
    And the country has 8 markets
    When the heritage conditions are evaluated
    Then the goal counts as two thirds met
    And the ambition is within reach

  @HER-022
  Scenario: A yes-or-no goal
    Given an ambition's goal is a single holds_place condition
    When the place is taken
    Then the progress goes from 0 of 1 straight to done, never within reach

  @HER-023
  Scenario: No free wins
    Given a drawn ambition's goal already holds on 11 Nov 1444
    When the campaign starts
    Then the ambition is put back and another is drawn

  @HER-024 @placeholder
  Scenario Outline: Counsel for a new aim
    Given the date is in era <era>
    And the country "Venice" last paid counsel <since> years ago
    When "Venice" asks for counsel on one ambition
    Then <result>

    Examples:
      | era | since | result                                                                  |
      | I   | 10    | it pays 30 gold and the ambition goes back to the pool for another       |
      | IV  | 12    | it pays 120 gold and the ambition goes back to the pool for another      |
      | VII | 11    | it pays 380 gold and the ambition goes back to the pool for another      |
      | II  | 6     | counsel is refused                                                      |

  @HER-024
  Scenario: No counsel when nothing else can be drawn
    Given the country "Venice" has an open ambition and an empty pool
    When "Venice" asks for counsel on one ambition
    Then counsel is refused as nothing is left to draw

  @HER-025 @placeholder
  # config: ambitions.envoy_reveal_years
  Scenario: Reading a rival through a resident envoy
    Given the country "Milan" has kept a resident envoy at the court of "Venice"
    When 2 years have passed
    Then "Milan" learns the name, goal and progress of one open ambition of "Venice"
    And never its reward

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
    And no setting reveals rewards

    Examples:
      | mode            | result                                        |
      | Drawn           | 3 are drawn with one historical guaranteed    |
      | Historical only | only ambitions tagged historical are drawn    |

  @HER-028
  Scenario: The tutorial ambition
    Given the player starts the tutorial
    When the tutorial teaches ambitions
    Then it uses one ambition with its goal and progress shown and its reward named but secret

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
  Scenario: The AI makes its weakest golden age inactive
    # config: ai.sleep_heyday
    Given the AI country "Milan" has 2 golden ages active worth 3 and 2 points
    When a third golden age worth 2.5 points would begin
    Then the AI makes the golden age worth 2 points inactive
    And 2 golden ages are active

  @HER-079 @placeholder
  Scenario: The AI lets its weakest legacy go
    # config: ai.let_go_legacy
    Given the AI country "Milan" holds 5 legacies, the weakest worth 0.5 points
    When it earns a sixth worth 2 points
    Then the AI lets the legacy worth 0.5 points go
    And "Milan" still holds 5 legacies

  @HER-078
  Scenario: Heritage counts time month by month
    Given the country "Portugal" has an active golden age in an active age
    When 300 months pass with its start condition holding
    Then the golden age has served 25 years

  @HER-090
  Scenario: One ambition follows another
    Given the country "Portugal" has in its pool an ambition requiring "The gold of Mina" done
    When ambitions are drawn while "The gold of Mina" is open
    Then the ambition stays in the pool
    When "The gold of Mina" is done
    Then the ambition can be drawn

  @HER-090
  Scenario: History opens an ambition
    Given the country "Portugal" has in its pool an ambition requiring the event "fall_of_constantinople"
    When ambitions are drawn before the event has happened
    Then the ambition stays in the pool
