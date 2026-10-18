@context-institutions
Feature: Hold
  As the game
  I want each institution's office to have one number for how strong it is
  So that the player sees at a glance what the office is worth

  @INST-001 @INST-002 @placeholder
  Scenario Outline: Hold words
    # config: hold.words
    Given the Empire has hold <hold>
    Then its hold reads "<word>"

    Examples:
      | hold | word   |
      | 0    | Hollow |
      | 19   | Hollow |
      | 20   | Weak   |
      | 50   | Firm   |
      | 80   | Strong |

  @INST-003
  Scenario: The yearly count is kept and clamped
    Given the Empire has hold 98
    And this year's hold gains add up to 5
    When January begins
    Then the Empire's hold is 100
    And the hold record lists each gain with its cause
