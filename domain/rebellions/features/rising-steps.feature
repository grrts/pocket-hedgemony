@context-rebellions
Feature: From grievances to a rising
  As the game
  I want a province's grievances to move it through grumbling, riots and plotting into a rising
  So that every rising grows out of causes the player can point at and fix

  @REBL-001 @REBL-002 @REBL-003 @placeholder
  Scenario Outline: Grievance count sets the step
    # config: rebellions.steps.grumbling, rebellions.steps.riots, rebellions.steps.plotting
    Given the province "Troyes" has <grievances> grievances
    And no judge runs the province "Troyes"
    When the month is processed
    Then the province "Troyes" is at the step "<step>"
    And the province "Troyes" has the effects "<effects>"

    Examples:
      | grievances | step      | effects                                                                    |
      | 1          | calm      | none                                                                       |
      | 2          | grumbling | growth slows; scholars and craftsmen start to leave                        |
      | 3          | riots     | tax halved; recruits halved; traders avoid it; the lord wavers             |
      | 4          | plotting  | tax halved; recruits halved; traders avoid it; the lord wavers; may rise   |

  @REBL-005 @REBL-006 @placeholder
  Scenario Outline: A plotting province rolls to rise each month
    # config: rebellions.rising_chance
    Given the province "Troyes" has <grievances> grievances
    When the month is processed
    Then the province "Troyes" rolls to rise with a chance of <chance> percent
    And the card of the province "Troyes" shows the chance and a named plotter

    Examples:
      | grievances | chance |
      | 4          | 5      |
      | 5          | 15     |
      | 6          | 30     |
      | 8          | 30     |

  Scenario: A rioting province never rises on its own
    Given the province "Troyes" has 3 grievances
    And no spark happens in the province "Troyes" this month
    When the month is processed
    Then no rising starts in the province "Troyes"

  @REBL-007
  Scenario: A rising musters rebels and shows the card
    Given the province "Troyes" has 4 grievances
    When the monthly roll for the province "Troyes" succeeds
    Then a rising starts in the province "Troyes"
    And rebels muster in the province "Troyes"
    And the rebellion card appears

  @REBL-008
  Scenario Outline: Each step shows on the map
    Given the province "Troyes" is at the step "<step>"
    When the player looks at the map
    Then the province "Troyes" shows the step "<step>"

    Examples:
      | step      |
      | grumbling |
      | riots     |
      | plotting  |
      | rising    |

  @REBL-009 @placeholder
  Scenario Outline: Homeless count fully, and twice above a fifth
    Given the province "Troyes" has <homeless> percent homeless
    And the province "Troyes" has 2 other grievances
    And no almshouse shelters the homeless of "Troyes"
    When the month is processed
    Then the province "Troyes" counts <count> grievances

    Examples:
      | homeless | count |
      | 8        | 2     |
      | 15       | 3     |
      | 25       | 4     |
