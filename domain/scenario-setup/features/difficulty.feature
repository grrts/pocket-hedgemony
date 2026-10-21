@context-scenario-setup
Feature: Difficulty
  As a player
  I want the difficulty I choose at new game to change how the world plays against me
  So that the same campaign can be gentler or harder without new rules to learn

  @SETUP-099
  Scenario Outline: A new campaign keeps its difficulty
    Given a new campaign as "France" on "<level>" difficulty
    When the campaign is saved and opened again
    Then the campaign plays on "<level>" difficulty

    Examples:
      | level  |
      | easy   |
      | normal |
      | hard   |

  @SETUP-099
  Scenario: A save from before difficulty was kept plays on normal
    Given a new campaign as "France" saved before difficulty was kept
    When the campaign is opened from that save
    Then the campaign plays on "normal" difficulty

  @SETUP-100 @placeholder
  Scenario: Normal plays as balanced
    Given a new campaign as "France" on "normal" difficulty
    Then the AI's war chance, AI income paid in and the player's rising chance are each multiplied by 1

  @SETUP-101 @placeholder
  Scenario Outline: The AI looks for a war by the difficulty
    Given a new campaign as "France" on "<level>" difficulty
    Then the AI's monthly chance to look for a war is <factor> times the balanced chance

    Examples:
      | level  | factor |
      | easy   | 0.5    |
      | normal | 1      |
      | hard   | 1.5    |

  @SETUP-102 @placeholder
  Scenario Outline: AI income pays in by the difficulty, the player's never
    Given a new campaign as "France" on "<level>" difficulty
    When a new month pays each realm's income into its treasury
    Then the treasury of "Castile" gains <factor> times its monthly income
    And the treasury of "France" gains its monthly income

    Examples:
      | level  | factor |
      | easy   | 0.8    |
      | normal | 1      |
      | hard   | 1.25   |

  @SETUP-103 @placeholder
  Scenario Outline: The player's plotting provinces rise by the difficulty
    Given a new campaign as "France" on "<level>" difficulty
    And a province of "France" and a province of "Castile" each have 4 grievances
    Then the province of "France" rises with <factor> times its balanced chance
    And the province of "Castile" rises with its balanced chance

    Examples:
      | level  | factor |
      | easy   | 0.75   |
      | normal | 1      |
      | hard   | 1.25   |
