@context-onboarding
Feature: When the player goes off script
  As a new player
  I want the tutorial to guide me without forcing an outcome
  So that my choices count as in a real campaign

  @TUT-030
  Scenario: Murad was asked to stay in chapter 1
    Given the player picked "Ask him to stay this winter" on the event "Murad goes back to Manisa"
    Then Murad stays at Edirne as a commander until the end of chapter 1
    When the player starts chapter 2
    Then chapter 2 starts from its chapter save with Murad at Manisa

  @TUT-031 @placeholder
  Scenario: Lost the border clash
    Given the player's army lost the border clash at "Giurgiu"
    Then the step reads "Your army broke. Fall back behind the walls of Edirne and call the levy."
    When the country "Hungary" fails to take one castle in two months
    Then Hungary offers terms
    And chapter 5 ends in peace

  @TUT-032
  Scenario: The wavering lord was ignored
    Given the player left the wavering lord alone in chapter 2
    Then his loyalty drops one step within chapter 2
    When the player starts chapter 7
    Then chapter 7 starts from its chapter save and nothing carries over

  @TUT-033 @placeholder
  Scenario Outline: An idle player is helped
    Given a do step is shown
    When the player is idle for <seconds> seconds
    Then <help>

    Examples:
      | seconds | help |
      | 8 | the pointer pulses on the target again |
      | 20 | the note adds "Stuck? {btn:skip_step} to skip this step." |

  @TUT-034
  Scenario: A short treasury is filled by a loan
    Given chapter 6 needs a minimum of gold at its start
    And the player has less than that minimum
    When chapter 6 starts
    Then a scripted loan from a Genoese or Venetian banking house fills the gap
    And it is shown as a real debt line

  @TUT-035
  Scenario: The storm fails in chapter 8
    Given the storm of the Hexamilion has failed
    Then the siege carries on month by month
    And the chapter ends when the wall is breached or the Morea offers terms
