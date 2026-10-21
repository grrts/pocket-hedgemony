@context-diplomacy
Feature: Acting on fear
  As an AI country
  I want to answer a much stronger neighbour with allies, walls and arms, and to take my chances
  So that a player who grows strong meets realms that band together, dig in and strike when he is busy

  # Leroy, 19 Oct (F-166). No rivalry: everything reads the month's fears (DIPL-231), measured afresh each month.
  # Config keys: diplomacy.arms_and_fear.allies, .defences, .technology, .opportunity (all provisional).

  @DIPL-238 @placeholder
  Scenario Outline: We fear the same realm
    Given the country "Savoy" fears the country "France" as Threatened
    And the country "Provence" fears the country "<feared>" as <level>
    When "Savoy" asks "Provence" for an alliance
    Then the count holds "We fear the same realm" at <number>

    Examples:
      | feared   | level      | number |
      | France   | Threatened | 30     |
      | France   | Wary       | 15     |
      | Burgundy | Threatened | 0      |

  @DIPL-238
  Scenario: Only an alliance counts a shared fear
    Given the country "Savoy" fears the country "France" as Threatened
    And the country "Provence" fears the country "France" as Threatened
    When "Savoy" asks "Provence" for a royal marriage
    Then the count holds "We fear the same realm" at 0

  @DIPL-239 @placeholder
  Scenario: Partners against a common fear
    Given the country "Savoy" fears the country "France" as Threatened
    And the countries "Burgundy", "Aragon", "England" and "Brittany" border "France"
    And "Burgundy" with 20000 soldiers, "Aragon" with 15000 and "England" with 30000 fear "France"
    And "Brittany" fears no one
    When "Savoy" looks for allies against its fear
    Then it weighs an alliance with "England", "Burgundy" and "Aragon", in that order
    And a Threatened realm weighs its envoys every 3 months instead of every 12

  @DIPL-240 @placeholder
  Scenario Outline: Walls on the feared border
    Given an AI realm at peace that is <fear> of a neighbour
    When it orders its works
    Then it walls its border with that neighbour up to castle step <step>

    Examples:
      | fear       | step |
      | calm       | 0    |
      | wary       | 1    |
      | threatened | 2    |

  @DIPL-241 @placeholder
  Scenario Outline: Arms in research
    Given an AI realm that is <fear>
    When it weighs the study of "<invention>"
    Then it counts <weight> of its study cost

    Examples:
      | fear       | invention | weight |
      | threatened | W3        | 0.6    |
      | wary       | B5        | 0.8    |
      | threatened | F01       | 1      |
      | calm       | W3        | 1      |

  @DIPL-242 @DIPL-243 @placeholder
  Scenario Outline: Taking an opportunity, and a gamble
    Given the AI's usual strength ratio before a declaration is 2
    And its target <busy> at war with another realm
    And this month it <gambles>
    When it weighs the declaration
    Then its side needs <ratio> times the target's side

    Examples:
      | busy   | gambles             | ratio |
      | is not | does not gamble     | 2     |
      | is     | does not gamble     | 1.5   |
      | is not | gambles             | 1.6   |
      | is     | gambles             | 1.2   |

  @DIPL-244
  Scenario: Allies against you out of fear
    Given the player is "France"
    And the country "Savoy" fears the country "France" as Threatened
    And the country "Provence" fears the country "France" as Wary
    And "Savoy" borders "France"
    When "Savoy" and "Provence" ally
    Then the player hears that they ally out of fear of their strength
