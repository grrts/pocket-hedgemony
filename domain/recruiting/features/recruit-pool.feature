@context-recruiting
Feature: The recruit pool
  As the game
  I want each province to keep its own pool of recruits, fallen and veterans
  So that a realm recovers from war at the pace of its people

  # config: refillPerYear (a quarter of the gap, a third with a muster master: D-RECR-3), run in the turn in which 1 January falls (D-RECR-11)
  @RECR-019 @placeholder
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

  @RECR-022 @placeholder
  # config: riotCallableShare 0.5 (D-RECR-24)
  Scenario: Riots halve what can be called
    Given the province "Troyes" has a ceiling of 2200 men and 2000 recruits here
    When the province "Troyes" riots
    Then the province "Troyes" can call 1000 men
    And the province "Troyes" still has a ceiling of 2200 men
    And the province "Troyes" can call 2000 men again when the riot ends

  @RECR-023 @RECR-024 @RECR-025 @placeholder
  # config: conscription; measured on recruits here after the levy against the ceiling, W15's tenth wins over the fallen's third (D-RECR-10)
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
      | has fallen from here and belongs to a realm with W15 Mass conscription | 120 | does not get |
      | has fallen from here and belongs to a realm with W15 Mass conscription | 90  | gets         |

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
    And the pool refill and the fading of fallen and veterans wait for January

  @RECR-100 @RECR-019 @placeholder
  Scenario: The yearly step runs when January begins
    Given the province "Troyes" has a ceiling of 2200 men and 1000 recruits here
    And the province "Troyes" has 700 fallen from here and 1400 veterans here
    When the turn in which 1 January falls passes
    Then the province "Troyes" has 1300 recruits here
    And the province "Troyes" has 630 fallen from here and 1260 veterans here
