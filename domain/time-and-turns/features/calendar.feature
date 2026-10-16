@context-time-and-turns
Feature: Calendar and campaign span
  As the game
  I want one month to pass per turn between a fixed start and a chosen end date
  So that a campaign runs from 1444 to 31 August 1939 and no further

  @TIME-001 @TIME-003
  Scenario: A turn advances the date by one month and the turn counter by one
    Given the date is "May 1492"
    And the turn counter is 577
    When the turn is processed
    Then the date is "June 1492"
    And the turn counter is 578

  @TIME-004
  Scenario Outline: The date rolls over at the end of the year
    Given the date is "<before>"
    When the turn is processed
    Then the date is "<after>"

    Examples:
      | before        | after         |
      | November 1444 | December 1444 |
      | December 1444 | January 1445  |
      | December 1938 | January 1939  |

  @TIME-002 @placeholder
  Scenario: A month is played out as 30 days
    Given the config value "march.daysPerMonth" is 30
    When the turn is processed
    Then the day loop runs 30 days

  @TIME-005 @open-question
  # OQ-TIME-1: March 1444 (engine) against 11 November 1444 (catalogue reference day)
  Scenario: A new 1444 campaign starts on the configured start date
    Given the config value "startDate" is year 1444 and month 3
    When a new campaign is started
    Then the date is "March 1444"
    And the turn counter is 0

  @TIME-006
  Scenario Outline: The end date is chosen when the campaign starts and kept with it
    Given a new campaign is set up with the end date "<chosen>"
    When the campaign is started
    Then the campaign end date is "<kept>"

    Examples:
      | chosen     | kept       |
      | default    | 1939-08-31 |
      | 1939-08-31 | 1939-08-31 |

  @TIME-007 @TIME-008
  Scenario: Reaching the end date ends the campaign with no play on
    Given the campaign end date is "1939-08-31"
    And the date is "August 1939"
    When the turn is processed
    Then the campaign ends
    And the final wrap-up events are shown
    And the closing sequence and the final result follow
    And no further turn can be processed

  @TIME-010 @open-question
  # OQ-TIME-10: when and how often victory is judged
  Scenario: A victory condition ends the campaign the same way as the end date
    Given the date is "June 1720"
    And a victory condition fires for the country "Castile"
    When the turn ends
    Then the campaign ends
    And no further turn can be processed

  @TIME-009
  Scenario Outline: Content after 1939 is out of scope
    Given the content "<content>"
    When the campaign content is assembled
    Then it is not part of the game

    Examples:
      | content                                   |
      | Era VIII (1960 onward)                    |
      | the 1939 to 1960 part of Era VII          |
      | the Second World War events               |
      | the Age of Decolonization                 |
      | the Cold War age                          |
      | the Age of Globalization                  |
