@context-recruiting
Feature: The recruit pool
  As the game
  I want each province to keep its own pool of recruits, fallen and veterans
  So that a realm recovers from war at the pace of its people

  # config: pool refill per year; OQ-RECR-3 (a third vs 25 % faster), OQ-RECR-11 (monthly split)
  @RECR-019 @placeholder @open-question
  Scenario Outline: The pool refills a share of the gap each year
    Given the province "Troyes" has a ceiling of 2200 men and 1000 recruits here
    And the official of province "Troyes" is <official>
    When a year passes
    Then the province "Troyes" has <recruits> recruits here

    Examples:
      | official        | recruits |
      | "a steward"       | 1300     |
      | "a muster master" | 1400     |

  @RECR-020 @RECR-021
  Scenario Outline: What fills and empties the pool
    Given the province "Troyes" has 1000 recruits here below its ceiling
    When <cause> happens in province "Troyes"
    Then the recruits here <change>

    Examples:
      | cause                     | change    |
      | disbanded men coming home | rise      |
      | a levy                    | fall      |
      | students enrolling        | fall      |
      | famine                    | fall      |
      | plague                    | fall      |
      | men dying in war          | fall      |
      | rebels drawing from it    | fall      |

  @RECR-020
  Scenario: A growing population raises the ceiling
    Given the province "Troyes" has a ceiling of 2200 men
    When its people grow
    Then its ceiling rises

  @RECR-022 @open-question
  # OQ-RECR-24: pool or ceiling, and for how long
  Scenario: Riots halve what can be called
    Given the province "Troyes" can call 2000 men
    When the province "Troyes" riots
    Then the province "Troyes" can call 1000 men

  @RECR-023 @RECR-024 @RECR-025 @placeholder @open-question
  # OQ-RECR-10: threshold base and how thresholds combine
  Scenario Outline: Conscription thresholds
    Given the province "Troyes" has a ceiling of 1000 men
    And the province "Troyes" <condition>
    When a levy leaves <left> recruits here
    Then the province "Troyes" <result> the grievance "Conscription"

    Examples:
      | condition                               | left | result       |
      | has no fallen and no W15                | 260  | does not get |
      | has no fallen and no W15                | 240  | gets         |
      | has fallen from here                    | 320  | gets         |
      | has fallen from here                    | 340  | does not get |
      | belongs to a realm with W15 Mass conscription | 120 | does not get |
      | belongs to a realm with W15 Mass conscription | 90  | gets         |

  @RECR-026 @RECR-027 @placeholder
  Scenario: Fallen from here cuts births for 10 years
    Given the province "Troyes" has 72000 people
    When 720 soldiers levied in "Troyes" die in war
    Then the province "Troyes" has 720 fallen from here
    And births in "Troyes" are cut by 0.2 percent for 10 years
    And each year a tenth of its fallen from here fades

  @RECR-028 @RECR-029
  Scenario: Veterans come home and fade
    Given an army with 1400 trained or blooded men from "Troyes"
    When the army disbands
    Then the province "Troyes" has 1400 more veterans here
    And each year a tenth of its veterans here are lost to old age

  @RECR-029
  Scenario: Veterans leave as settlers
    Given the province "Troyes" has 1400 veterans here
    When 200 veterans leave as settlers
    Then the province "Troyes" has 1200 veterans here

  @RECR-100
  Scenario: The monthly update ticks training down
    Given the province "Troyes" trains 2500 pikes with 3 months left
    When a month passes
    Then the training has 2 months left
    And the pool refill and the fading of fallen and veterans are applied for the month
