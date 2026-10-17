@context-warfare
Feature: Kinds of soldiers and their break points
  As a player
  I want each kind of soldier to be paid, to stay and to break by its own rules
  So that where my soldiers come from matters as much as how they fight

  # Config keys: warfare.kinds.<kind>.break_point, warfare.kinds.levy.free_months,
  # warfare.kinds.levy.go_home_after, warfare.kinds.hired.pay_multiplier, warfare.kinds.standing.pay_multiplier,
  # warfare.break.homeland, warfare.break.hungry, warfare.break.pay_owed

  @WAR-015 @placeholder
  Scenario Outline: Each kind has its pay and break point
    Given a company of kind "<kind>"
    When the company is evaluated
    Then its base break point is <break> %
    And its pay is "<pay>"

    Examples:
      | kind              | break | pay                                              |
      | levy              | 25    | free for the first 3 months, then normal pay     |
      | retinue           | 35    | paid by the lord                                 |
      | hired company     | 35    | three times normal pay                           |
      | standing regiment | 30    | 1.5 times normal pay, all year                   |
      | garrison          | 40    | normal pay                                       |
      | rebel band        | 20    | loot                                             |

  @WAR-015
  Scenario: Standing regiments need W12
    Given the country "France" does not know "W12 Standing regiments"
    When the company is evaluated
    Then the country "France" cannot keep a company of kind "standing regiment"

  @WAR-016 @placeholder
  Scenario Outline: Levies go home after 6 months unless paid double
    Given a levy company of 1000 men that has been out <months> months
    And it is <paid>
    When the month ends
    Then the company has <men> men

    Examples:
      | months | paid             | men  |
      | 5      | paid normally    | 1000 |
      | 6      | paid normally    | 950  |
      | 6      | paid double      | 1000 |

  @WAR-017
  Scenario: Levies away at harvest cost the harvest
    Given 3250 farmers of Champagne serve as levies
    When the harvest comes while they are away
    Then the province is told that share of its farmers is away for the harvest

  @WAR-018
  Scenario: A wavering lord takes his retinue home mid-war
    Given the lord "Count of Foix" is wavering and his retinue serves in an army at war
    When he decides to go home
    Then his retinue leaves the army

  @WAR-019
  Scenario Outline: Unpaid hired companies
    Given a hired company is owed <months> months of pay
    When it stands in the province "Champagne" and an enemy offers <offer>
    Then the hired company <does>

    Examples:
      | months | offer                  | does                                         |
      | 1      | nothing                | will not fight                               |
      | 2      | nothing                | loots the province it stands in              |
      | 2      | more than its pay owed | takes the enemy's offer                      |

  @WAR-020
  Scenario: Standing regiments keep drill and scars through peace
    Given a standing regiment with drill 24 and scars 3
    When a year of peace passes
    Then the company has drill 24

  @WAR-021 @WAR-030
  Scenario: Garrisons count against their castle's room
    Given a stone castle with garrison room 2000
    And a garrison of 2500 men in it
    When the company is evaluated
    Then 500 men of that garrison count toward the troop cap

  @WAR-022
  Scenario: Rebel bands fight by the battle rules
    Given the rebellions context forms a rebel band in the province "Champagne"
    When it meets a royal army
    Then the rebel band fights by the battle rules as kind "rebel band"

  @WAR-023 @placeholder
  Scenario Outline: Break point modifiers
    Given a company of kind "levy" with base break point 25 %
    And <condition>
    When the company is evaluated
    Then its break point is <break> %

    Examples:
      | condition                                   | break |
      | it defends its own homeland                 | 30    |
      | it is hungry                                | 15    |
      | it is owed 2 months of pay                  | 15    |
      | its army's commander has the trait "Steady" | 30    |
