@context-onboarding
Feature: Measuring the tutorial
  As the team
  I want to know where players leave the tutorial and which entries are muted
  So that confusing steps and noisy checks can be fixed

  @TUT-114
  Scenario Outline: Only consented events are sent
    Given the player <consent> consented to measuring
    When the player skips step 3 of chapter 2
    Then <result>

    Examples:
      | consent | result |
      | has | one event "step skipped" is sent and nothing else |
      | has not | nothing is sent |

  @TUT-114
  Scenario Outline: What is measured
    Given the player has consented to measuring
    When <action>
    Then one measuring event is sent

    Examples:
      | action |
      | a tutorial step is reached |
      | a tutorial step is finished |
      | a Needs attention entry is followed |
      | a Needs attention kind is muted |

  @TUT-115 @placeholder
  Scenario: Offline events expire
    Given the player has consented and is offline
    And a measuring event was queued 31 days ago
    When the game goes online
    Then that event has been dropped
