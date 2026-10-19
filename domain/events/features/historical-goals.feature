@context-events
Feature: Realms' historical goals
  As an AI country
  I want to pursue the goals my realm really had, for the reasons it had them
  So that history runs its normal course while each campaign can still go its own way

  @EVT-085 @EVT-088
  Scenario: A goal ends when its reason ends
    Given the Ottomans have the goal "Take Constantinople" with the aim to take Constantinople
    When the Ottomans hold Constantinople
    Then the goal "Take Constantinople" has ended as achieved

  @EVT-088
  Scenario: A goal to hold a place is lost with the place
    Given Byzantium has the goal "Hold the city" with the aim to hold Constantinople
    When the Ottomans hold Constantinople
    Then the goal "Hold the city" has ended as lost

  @EVT-086 @placeholder
  Scenario Outline: The seed shakes the goals by the Events preset
    Given 400 goals of which half have an alternative aim
    When a campaign starts with the Events choice "<choice>"
    Then about <share> of the goals deviate, those with an alternative taking it and the others dropped
    And every weight is multiplied by <mult>

    Examples:
      | choice     | share | mult |
      | Historical | 10 %  | 1.5  |
      | Plausible  | 25 %  | 1    |
      | Free       | 50 %  | 0.5  |

  @EVT-087 @placeholder
  Scenario: A goal's pull rises before its window and fades after it
    Given a strong goal with the window 1450 to 1460
    Then its time factor is 0 in 1442, one half in mid-1447, 1 in 1455, one half in mid-1466 and 0 in 1471

  @EVT-089 @EVT-090 @placeholder
  Scenario: A goal draws the AI's war, but never past its price
    Given Byzantium has the strong goal "Beat the Ottomans" with the aim to fight the Ottomans
    And the Ottomans' side is far stronger than Byzantium's
    When Byzantium looks for a war every month for 20 months
    Then Byzantium never declares war on the Ottomans

  @EVT-091
  Scenario: An ally goal sends an envoy toward its target
    Given Castile has the goal "Ally Portugal" with the aim to ally with Portugal
    When Castile sends its envoys
    Then it weighs proposing an alliance and arranging a marriage with Portugal, with 10 count points for each point of the goal's pull

  @EVT-092
  Scenario: The player's realm is never steered
    Given the player rules the Ottomans, who have the goal "Take Constantinople"
    Then the Ottomans have no pull toward Byzantium

  @EVT-093
  Scenario: A save keeps every goal's state
    Given a campaign whose goals were shaken and one of which has lapsed
    When it is saved and loaded
    Then every goal has the same weight, the same deviation and the same end
