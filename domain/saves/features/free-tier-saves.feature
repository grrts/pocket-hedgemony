@context-saves
Feature: Free tier and full game saves
  As a free player
  I want my saves to carry over when I buy the full game
  So that buying never costs me a campaign

  @SAVE-080
  Scenario: One app on phones
    Given the game is the free mobile tier
    And the player has a campaign as "France"
    When the player buys the full game
    Then the same saves stay in place
    And locked nations become playable

  @SAVE-080
  Scenario Outline: The header records the lock
    Given the game is the free mobile tier
    When a save of the nation "<nation>" is written
    Then its header's tier has nation "<nation>" and needsFullGame <needs>

    Examples:
      | nation   | needs |
      | ottomans | false |
      | france   | false |
      | portugal | true  |

  @SAVE-081
  Scenario: A locked nation's save shows the unlock screen
    Given the game is the free mobile tier without the full game
    And a save of the nation "Portugal" exists
    When the player opens it
    Then the message "Portugal is part of the full game. Unlock it to continue this campaign." is shown with the unlock screen
    And the save is not deleted

  @SAVE-082
  Scenario: Refunds keep saves
    Given the player bought the full game and has a campaign as "Portugal"
    When the purchase is refunded
    Then the saves of "Portugal" stay
    And opening one asks to unlock "Portugal" again

  @SAVE-083
  Scenario: Steam demo saves on the same computer
    Given the Steam demo has saves in its save folder
    When the full game launches for the first time on the same computer
    Then it finds the demo's saves under the same save folder name
    And copies them into its own folder
    And Steam Cloud keeps them from then on

  @SAVE-084
  Scenario Outline: Demo saves on another device
    Given the player played the Steam demo <account>
    When the player opens the full game on another device
    Then the demo saves arrive <how>

    Examples:
      | account              | how                         |
      | signed in            | through our server          |
      | without an account   | by Export and Import        |

  @SAVE-085
  Scenario: The full game opens a demo save with no limits
    Given a save made in the Steam demo
    Then its header's tier names the app "demo" and lists no limits
    When the full game loads it
    Then the save opens
