@context-diplomacy
Feature: Pledges and sworn peace
  As a country
  I want to shelter a small neighbour, or swear peace without a war
  So that I have promises lighter than an alliance

  @DIPL-122
  Scenario Outline: Pledging protection
    Given the country "<protector>" <condition> the country "<protected>"
    When the country "<protector>" pledges protection to the country "<protected>"
    Then the pledge is <result>

    Examples:
      | protector | protected | condition                 | result   |
      | Hungary   | Ragusa    | is at peace with          | made     |
      | Hungary   | Bosnia    | is at war with            | refused  |
      | France    | Brittany  | is the overlord of        | refused  |

  @DIPL-122
  Scenario: A pledge is a fact, not a relation
    Given the diplomacy rules are in force
    When the country "Hungary" pledges protection to the country "Moldavia"
    Then the fact "protection_pledge" from "Hungary" to "Moldavia" exists
    And the ledger of "Moldavia" toward "Hungary" holds "Pledged to protect us" at +15
    And no relation type between them is created or blocked
    And "Moldavia" owes "Hungary" nothing

  @DIPL-123
  Scenario: A pledge becomes a defensive call
    Given the country "Hungary" pledged protection to the country "Moldavia"
    When the country "Poland" declares war on "Moldavia"
    Then the country "Hungary" gets a defensive call as if allied
    When the country "Hungary" refuses the call
    Then the country "Hungary" gains an Oath broken

  @DIPL-124 @placeholder
  Scenario Outline: Swearing peace
    # config: actions.swear_peace
    Given the country "A" has <ratio> times the soldiers of the country "B"
    And the country "B" <claim> a claim on land of "A"
    When the country "A" asks the country "B" to swear peace
    Then the sworn peace's own reasons total <number>

    Examples:
      | ratio | claim       | number |
      | 1     | holds no    | -10    |
      | 2     | holds no    | 0      |
      | 2     | holds       | -30    |

  @DIPL-124 @placeholder
  Scenario: A sworn peace is a ten-year truce
    # config: actions.swear_peace.truce_months
    Given the date is "1450-01"
    When the country "B" agrees to swear peace with the country "A"
    Then "A" and "B" have a truce with origin "gameplay" until "1460-01"

  @DIPL-125
  Scenario: Breaking a sworn peace
    Given the countries "A" and "B" have a sworn peace
    When the country "A" breaks the truce with the country "B"
    Then the country "A" gains an Oath broken
    And the ledger of "B" toward "A" holds "Broke a truce with us" at -40
    And both stances between them are "hostile"
