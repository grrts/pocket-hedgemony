@context-saves
Feature: Resume save and orders journal
  As a player on a phone
  I want the game to survive being killed in the background
  So that I never lose more than the orders I gave since my last End turn

  Background:
    Given the campaign as "Portugal" is loaded at turn 820, March 1512

  @SAVE-024
  Scenario: The Resume save is written in the worker
    When the player ends the turn
    Then the engine worker writes the Resume save for turn 821
    And the player can already give orders while it writes

  @SAVE-025
  Scenario: The journal holds the queued orders
    When the player queues a march order and a levy order
    Then the orders journal holds those 2 orders as the same values End turn would send
    And the journal records turn 820 and the hash of the Resume save of turn 820

  @SAVE-026 @placeholder
  Scenario Outline: When the journal is written
    # config keys: orders_journal.write_on, orders_journal.safety_interval_seconds
    Given the player has queued orders since the turn began
    When <trigger>
    Then the orders journal is written

    Examples:
      | trigger                                                   |
      | the app is backgrounded                                   |
      | the app is suspended                                      |
      | the app is closed                                         |
      | 30 seconds pass while the orders are changing             |

  @SAVE-002 @SAVE-027
  Scenario: Killed in the background, nothing lost
    Given the player has queued 4 orders in turn 820
    And the app was backgrounded and the journal written
    And the system killed the app
    When the player continues
    Then the Resume save of turn 820 is loaded
    And the 4 orders are back in the queue
    And the state is exactly as the player left it

  @SAVE-028
  Scenario Outline: A journal that doesn't match is ignored
    Given the journal records turn <journal turn> and the hash "<journal hash>"
    And the Resume save is turn 820 with the hash "h820"
    When the player continues
    Then the journal is <result>

    Examples:
      | journal turn | journal hash | result   |
      | 820          | h820         | applied  |
      | 819          | h819         | ignored  |
      | 820          | other        | ignored  |

  @SAVE-029
  Scenario Outline: Platform hooks write the journal
    Given the game runs on "<platform>"
    And the player has queued orders
    When the platform raises "<platform event>"
    Then the orders journal is written

    Examples:
      | platform | platform event                         |
      | iOS      | App plugin pause                       |
      | iOS      | appStateChange to inactive             |
      | Android  | App plugin pause                       |
      | desktop  | window close                           |
      | desktop  | before-quit                            |
      | desktop  | powerMonitor suspend                   |
      | web      | visibilitychange to hidden             |
      | web      | pagehide                               |

  @SAVE-030
  Scenario: Backgrounded during a turn
    Given the player ended turn 820 and the turn is being processed
    When the app is backgrounded and later killed
    And the player continues
    Then nothing new was saved
    And the previous Resume save and journal are used
    And turn 820 is processed again with the same result

  @SAVE-031 @placeholder
  Scenario Outline: Desktop quit waits for the write
    Given the game runs on desktop
    And a write takes <write> seconds
    When the player quits
    Then the game closes after <close> seconds

    Examples:
      | write | close |
      | 0.3   | 0.3   |
      | 5     | 2     |
