@context-settings
Feature: Gameplay settings
  As a player
  I want to choose how often the game saves, asks, reports and explains
  So that it fits how I play

  @SET-061 @SET-062
  Scenario Outline: Autosave rows
    Given the campaign is not ironman
    When the player opens Gameplay
    Then "<setting>" offers "<options>" with the default "<default>"

    Examples:
      | setting                      | options                                                       | default        |
      | Autosave                     | Every month, Every 6 months, Every 12 months (each January), Off | Every 12 months |
      | Autosaves kept per campaign  | 1, 3, 5                                                       | 3              |

  @SET-061
  Scenario: Autosave off keeps the Resume save
    Given "Autosave" is "Off"
    When the player ends a turn
    Then no rotating autosave is written
    And the Resume save is written

  @SET-063
  Scenario: Ironman hides the autosave rows
    Given the loaded campaign is ironman
    When the player opens Gameplay
    Then "Autosave" and "Autosaves kept per campaign" are not shown

  @SET-064
  Scenario Outline: Confirm End turn
    Given "Confirm End turn" is "<value>"
    And the Attention screen has <lines> lines
    And <events> events are unanswered
    When the player ends the turn
    Then <result>

    Examples:
      | value                                | lines | events | result                                                           |
      | Off                                  | 3     | 0      | the turn ends with one tap                                       |
      | When the Attention screen has lines  | 0     | 0      | the turn ends with one tap                                       |
      | When the Attention screen has lines  | 3     | 0      | the question names the count with "Look" and "End turn anyway"   |
      | Always                               | 0     | 0      | a question is asked                                              |
      | Off                                  | 3     | 2      | End turn opens the first unanswered event instead               |
      | Always                               | 3     | 2      | End turn opens the first unanswered event instead               |

  @SET-065
  Scenario Outline: Battle playback speed
    Given "Battle playback speed" is "<speed>"
    When a player battle runs
    Then the turn does not stop
    And each 4-hour step plays back in <seconds> seconds

    Examples:
      | speed | seconds |
      | 1×    | 0.5     |
      | 2×    | 0.25    |
      | 4×    | 0.125   |

  @SET-131
  Scenario Outline: Turn playback speed
    Given "Turn playback speed" is "<speed>"
    When the week plays out after End turn
    Then each day of the week plays back in <seconds> seconds

    Examples:
      | speed | seconds |
      | 1×    | 0.3     |
      | 2×    | 0.15    |
      | 4×    | 0.075   |

  @SET-066
  Scenario Outline: Open the turn report
    Given "Open the turn report" is "<value>"
    And the turn <happened>
    When the turn ends
    Then the turn report <result>

    Examples:
      | value                                    | happened                           | result         |
      | Every turn                               | had nothing important              | opens          |
      | When something important happened       | had nothing important              | does not open  |
      | When something important happened       | had something important            | opens          |
      | Never                                    | had something important            | does not open  |

  @SET-067
  Scenario Outline: Jump to events
    Given "Jump to events" is "<value>"
    When an event card for "Pest" opens
    Then the camera <result>

    Examples:
      | value | result                    |
      | On    | glides to "Pest"          |
      | Off   | stays where it was        |

  @SET-068 @SET-069
  Scenario Outline: Tooltips by input
    Given "Tooltips" is "On" and "Tooltip delay" is "Short"
    When the player <input> a stat
    Then its tooltip shows <timing>

    Examples:
      | input                                   | timing           |
      | hovers the mouse over                   | after 0.3 s      |
      | long-presses                            | on the long press |
      | focuses with the controller and presses Y on | at once     |

  @SET-069
  Scenario Outline: Tooltip delay is desktop only
    Given the game runs on "<platform>"
    When the player opens Gameplay
    Then "Tooltip delay" is <shown>

    Examples:
      | platform | shown                                                      |
      | desktop  | shown with Instant, Short (0.3 s) and Long (0.8 s)         |
      | Android  | not shown                                                  |

  @SET-070
  Scenario: Detailed tooltips
    Given "Detailed tooltips" is "On"
    When the player looks at a province's gold
    Then the tooltip shows the full breakdown such as "+12 from the market, −3 from the war tax"

  @SET-071
  Scenario: Tutorial hints and no advisor
    Given the player has never changed Gameplay
    When the player opens Gameplay
    Then "Tutorial hints" is "On" with the action "Reset tutorial and hints"
    And there is no advisor row
    And muting a kind of warning is not offered here

  @SET-072
  Scenario: Achievement toasts off
    Given "Achievement toasts" is "Off"
    When the player earns an achievement in an ironman campaign
    Then no toast is shown
    And the achievement unlocks

  @SET-073
  Scenario Outline: Place names
    Given a historical name list exists
    And "Place names" is "<value>"
    When the map redraws the city on the Bosporus held by <owner>
    Then it is named "<name>"

    Examples:
      | value      | owner                     | name           |
      | Historical | the Ottomans              | Istanbul       |
      | Historical | its owner before the Ottomans | Constantinople |
      | Modern     | its owner before the Ottomans | Istanbul       |

  @SET-073
  Scenario: Until the name list exists
    Given no historical name list exists
    When "Place names" is "Historical" or "Modern"
    Then both show today's region names

  @SET-074
  Scenario Outline: Date format
    Given "Date format" is "<format>"
    When the date 16 October 1444 is shown
    Then it reads "<text>"

    Examples:
      | format           | text             |
      | 16 October 1444  | 16 October 1444  |
      | 16 Oct 1444      | 16 Oct 1444      |
      | 16.10.1444       | 16.10.1444       |
      | 1444-10-16       | 1444-10-16       |
