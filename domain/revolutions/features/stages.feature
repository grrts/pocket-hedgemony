@context-revolutions
Feature: Stages of a revolution
  As the game
  I want each revolution to move through clear stages
  So that the player always knows how close it is and gets one last chance to act

  @REVO-007
  Scenario Outline: Stage follows requirements, signs and the event
    Given the country "France" <situation>
    When the turn is processed
    Then the revolution "french_revolution" is at the stage "<stage>" for "France"

    Examples:
      | situation                                                         | stage      |
      | does not meet the requirements                                    | Quiet      |
      | meets the requirements with no sign lit                           | Quiet      |
      | meets the requirements with 2 signs lit                           | Brewing    |
      | meets the requirements with 4 signs lit                           | Ready      |
      | has just had the event fire                                       | Outbreak   |
      | is fighting the rising its Fight option raised                    | Struggle   |
      | has just seen that rising won or crushed                          | Settlement |
      | has had the regime applied                                        | Aftermath  |

  @REVO-007
  Scenario: A ready revolution rolls through the event's selection with its sparks
    Given the revolution "french_revolution" is Ready for "France"
    And the event "french_revolution" has a mean wait of 4 years
    And the event "laki_eruption" has happened
    When the month's selection roll is made
    Then the chance is based on 4 years and multiplied by 2

  @REVO-008
  Scenario: Never the same turn the last sign lights
    Given the country "France" has 3 signs of "french_revolution" lit
    When a fourth sign lights this turn
    Then the event "french_revolution" does not fire this turn
    And the card shows "may break out any month" in red

  @REVO-009
  Scenario: Easing a sign below need stops the roll
    Given the revolution "french_revolution" is Ready for "France" with 4 signs lit
    When the player opens the castle stores so that "Bread is short in a fifth of the realm" goes dark
    Then the revolution "french_revolution" is at the stage "Brewing" for "France"
    And the event "french_revolution" no longer rolls
