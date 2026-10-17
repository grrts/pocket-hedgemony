@context-events
Feature: The campaign span of the event tree
  As the game
  I want events to run from 1444 to 31 August 1939 only
  So that the Second World War and later ages never fire in a campaign

  @EVT-001
  Scenario: No event fires after the end date
    Given the campaign end date is 31 August 1939
    And the date is 31 August 1939
    When the month is processed
    Then the campaign ends
    And no event fires after that date

  @EVT-002
  Scenario Outline: Events after the end date are dropped from a campaign
    Given the event "<event>" starts in history on <date>
    When a campaign loads its events
    Then the event "<event>" is dropped and never fires

    Examples:
      | event                | date       |
      | world_war_ii         | 1939-09-01 |
      | holocaust            | 1941       |
      | bengal_famine_1943   | 1943       |
      | atomic_bombings      | 1945       |

  @EVT-002
  Scenario Outline: Interwar events stay in scope
    Given the event "<event>"
    When the out-of-scope list is applied
    Then the event "<event>" can still fire in a campaign

    Examples:
      | event                     |
      | treaty_of_versailles      |
      | great_depression          |
      | italian_invasion_of_ethiopia |
      | second_sino_japanese_war  |

  @EVT-003
  Scenario Outline: Later ages never start
    Given the date is 1935
    And the start condition of the age "<age>" holds
    When the yearly age check runs
    Then the age "<age>" does not start

    Examples:
      | age                   |
      | age_of_decolonization |
      | cold_war              |
      | age_of_globalization  |

  @EVT-003
  Scenario: An age that names a dropped event can only end another way
    Given the end condition of the age "age_of_world_wars" names the event "world_war_ii"
    When a campaign loads its events
    Then that part of the end condition never holds
    And the age "age_of_world_wars" is cut at the end date
