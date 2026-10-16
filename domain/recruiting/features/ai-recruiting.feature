@context-recruiting
Feature: How the AI recruits
  As an AI country
  I want to use the same levy, training and commission commands as the player
  So that my armies follow my personality and the same rules

  @RECR-097
  Scenario Outline: Personality sets how deep to levy and what to train
    Given the AI country "<country>" has personality "<personality>"
    When it raises an army
    Then it <behaviour>

    Examples:
      | country | personality         | behaviour                                |
      | A       | militarist          | levies deep and trains expensive arms    |
      | B       | merchant republic   | levies little and hires companies instead |
      | C       | steppe realm        | trains horse archers                     |

  @RECR-098
  Scenario Outline: Avoiding the harvest
    Given the date is in a harvest month for the AI country "A"
    And an enemy army <enemy> in its land
    When the AI country "A" decides whether to levy
    Then it <decision>

    Examples:
      | enemy  | decision           |
      | is not | does not levy      |
      | is     | may levy           |

  @RECR-099
  Scenario: Commissioning order
    Given the AI country "A" has a steward, a warden and a tax collector as officials
    When it needs a commander
    Then it commissions the steward or the warden first
    And keeps the tax collector in his seat
