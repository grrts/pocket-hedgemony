@context-subjects
Feature: Playing as a subject
  As a player of a subject
  I want real choices toward my overlord
  So that playing a subject is fun, not a waiting room

  @SUBJ-102
  Scenario: The card from below
    Given the player plays "Brittany", a Vassal of "France"
    When the player opens the overlord view
    Then the player sees the same badges that move the loyalty of "Brittany"
    And the player may pay and be protected, stop paying, seek a backer, wait for a bad war of "France", or marry into the house of "France"

  @SUBJ-102
  Scenario: Stopping payment turns a subject disloyal step by step
    Given the player plays the Loyal Vassal "S"
    When the player stops paying
    Then "S" moves toward "Disloyal" one step at a time

  @SUBJ-103
  Scenario Outline: Asking to loosen
    Given the player plays the Loyal Vassal "S" of the AI country "O"
    And "O" <state>
    When "S" sends an envoy to ask politely for a looser type
    Then the ask is <result>

    Examples:
      | state                          | result  |
      | is cautious                    | granted |
      | is over its subject limit      | granted |
      | is neither cautious nor over its subject limit | refused |

  @SUBJ-104
  Scenario: The subject becomes the master
    Given the player's subject "S" has outgrown its overlord "O"
    And "S" wins its independence war
    When "S" makes peace with enough peace voices of "O" for it
    Then "O" may become the subject of "S" in the same peace

  @SUBJ-105
  Scenario: Every playable subject is playable from the start
    Given the catalogue lists 218 playable subjects
    When the player picks a country to start the campaign
    Then each of the 218 playable subjects can be chosen
