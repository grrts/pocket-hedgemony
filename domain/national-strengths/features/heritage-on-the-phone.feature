@context-national-strengths
Feature: Heritage on the phone
  As a player on a small screen
  I want heritage in one row, quiet moments and a picker summary
  So that it is visible without clutter

  @HER-070
  Scenario: The Heritage row
    Given the country "Venice" has a birthright, an awake heyday, 3 sealed ambitions and a burden
    When the player opens the country card
    Then one Heritage row shows the birthright icon, the heyday icon, three seals and the burden icon
    And tapping it opens the Heritage sheet

  @HER-071
  Scenario Outline: Quiet moments
    Given the country "Venice" has an ambition
    When <change>
    Then a small quiet animation plays
    And the monthly digest has one line about it

    Examples:
      | change                         |
      | its seal cracks                |
      | its warmth rises to hot        |

  @HER-072
  Scenario: The map shimmers over a hot ambition
    Given the country "Venice" has a hot ambition naming "Bergamo", "Brescia" and "Crema"
    When the player looks at the map
    Then the region faintly shimmers
    And the target is neither outlined nor named

  @HER-073
  Scenario: The nation picker
    Given the player is choosing a country
    When the player looks at "Portugal"
    Then the picker shows its birthright and burden, a count of its sealed ambitions and its heydays as ages

  @HER-074
  Scenario: Free tier
    Given the player plays the free tier
    When the player picks an allowed country
    Then its heritage works exactly as in the full game
