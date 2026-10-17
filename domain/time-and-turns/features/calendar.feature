@context-time-and-turns
Feature: Calendar and campaign span
  As the game
  I want one week to pass per turn between a fixed start and a chosen end date
  So that a campaign runs from 1444 to 31 August 1939 and no further

  @TIME-001 @TIME-003
  Scenario: A turn advances the date by 7 days and the turn counter by one
    Given the day is "3 June 1492"
    And the turn counter is 570
    When the turn is processed
    Then the day is "10 June 1492"
    And the turn counter is 571

  @TIME-004
  Scenario Outline: The date rolls over at the end of the month and the year
    Given the day is "<before>"
    When the turn is processed
    Then the day is "<after>"

    Examples:
      | before           | after            |
      | 11 November 1444 | 18 November 1444 |
      | 25 November 1444 | 2 December 1444  |
      | 28 December 1444 | 4 January 1445   |
      | 26 February 1448 | 4 March 1448     |
      | 29 December 1938 | 5 January 1939   |

  @TIME-002
  Scenario Outline: Months have their real number of days
    When the length of <month> is looked up
    Then it has <days> days

    Examples:
      | month         | days |
      | November 1444 | 30   |
      | January 1445  | 31   |
      | February 1445 | 28   |
      | February 1448 | 29   |
      | February 1500 | 28   |
      | February 1600 | 29   |

  @TIME-002 @TIME-044
  Scenario: A turn plays 7 days and runs the weekly steps once
    Given a day loop that starts on 11 November 1444
    When one turn is played
    Then the day loop runs 7 days, to 17 November 1444
    And the weekly steps run once, after the 7th day

  @TIME-074
  Scenario Outline: Monthly, seasonal and yearly steps run in the turn a new month, season or year begins
    Given the turn starts on <first>
    When the turn's span is worked out
    Then monthly steps <monthly>, seasonal steps <seasonal> and yearly steps <yearly>

    Examples:
      | first            | monthly        | seasonal | yearly   |
      | 11 November 1444 | do not run     | do not   | do not   |
      | 25 November 1444 | run for December 1444 | do   | do not   |
      | 29 December 1444 | run for January 1445  | do not | do     |
      | 1 March 1445     | run for March 1445    | do   | do not   |
      | 2 March 1445     | do not run     | do not   | do not   |

  @TIME-007 @TIME-074
  Scenario: The last turn ends on 31 August 1939 and may be shorter
    Given the turn starts on 26 August 1939
    When the turn's span is worked out
    Then the turn covers 6 days, to 31 August 1939
    And it is the last turn

  @TIME-005
  Scenario Outline: Every campaign starts on 11 November 1444
    When <what> is started
    Then the date is "November 1444"
    And the start day is 11
    And the turn counter is 0

    Examples:
      | what                                |
      | a new campaign                      |
      | the tutorial "The Year of Varna"    |

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
    And the day is "26 August 1939"
    When the turn is processed
    Then the campaign ends
    And the final wrap-up events are shown
    And the closing sequence and the final result follow
    And no further turn can be processed

  @TIME-010
  Scenario: World domination wins at once in a January turn and play goes on
    Given the date is "January 1720"
    And the country "Castile" owns or holds as subjects 610 of the world's 1200 settled land provinces
    When the turn is processed
    Then "Castile" wins by world domination in "January 1720"
    And the campaign does not end
    And the next turn can be processed

  @TIME-010
  Scenario Outline: World domination is checked only in January turns
    Given the date is "<date>"
    And the country "Castile" owns or holds as subjects <held> of the world's 1200 settled land provinces
    When the turn is processed
    Then <outcome>

    Examples:
      | date         | held | outcome                                                |
      | June 1720    | 610  | no win is declared                                     |
      | January 1721 | 600  | "Castile" wins by world domination in "January 1721"   |
      | January 1721 | 599  | no win is declared                                     |

  @TIME-069
  Scenario: The leader in each score wins at the end date, and ties share the win
    Given the campaign end date is "1939-08-31"
    And the day is "26 August 1939"
    And the final scores are:
      | realm   | Economy | Power | Technology |
      | Britain | 900     | 700   | 800        |
      | Germany | 700     | 900   | 800        |
      | France  | 600     | 600   | 700        |
    When the turn is processed
    Then the campaign ends
    And "Britain" wins in "Economy"
    And "Germany" wins in "Power"
    And "Britain" and "Germany" share the win in "Technology"

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
