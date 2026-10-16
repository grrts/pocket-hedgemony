@context-onboarding
Feature: Skipping, leaving and returning
  As a new player
  I want never to be trapped by the tutorial
  So that I can learn at my own pace or skip to the game

  @TUT-005
  Scenario Outline: Everything can be skipped or left
    Given the tutorial is running
    When the player chooses to "<action>"
    Then <result>

    Examples:
      | action | result |
      | skip the step | the next step is shown |
      | skip this chapter | the next chapter starts from its chapter save |
      | leave the tutorial | the player returns to the menu and nothing in the game is locked |

  @TUT-004
  Scenario: Coming back mid-chapter
    Given the player is on step 4 of chapter 3
    When the player closes the app and opens it again
    Then the tutorial resumes at step 4 of chapter 3

  @TUT-105
  Scenario: The chapter list
    Given chapters 0 to 3 are done
    When the player opens the chapter list in the main menu
    Then chapters 0 to 3 show a tick
    And the player can start chapter 7

  @TUT-106
  Scenario: Progress lives apart from campaign saves
    Given chapters 0 to 3 are done and the kind "army food low" is muted
    When the player deletes every campaign save
    Then chapters 0 to 3 are still done
    And the kind "army food low" is still muted

  @TUT-107
  Scenario: Keep ruling the Ottomans
    Given chapter 9 is reached
    When the player picks "Keep ruling the Ottomans"
    Then the tutorial save becomes a normal campaign save
    And the quiet world lifts and scripted events stop
    And the Needs attention list replaces the vizier's notes
    And the save is marked "began as the tutorial" and is not ironman

  @TUT-108
  Scenario: The tutorial earns no achievements
    Given the tutorial is running
    When the first harvest is brought in
    Then no achievement unlocks
