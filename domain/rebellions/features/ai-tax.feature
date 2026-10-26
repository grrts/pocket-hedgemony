@context-rebellions
Feature: The AI raises lowered taxes again
  As the game
  I want an AI realm to raise a tax a rising lowered once nothing keeps it light
  So that the AI's taxes do not only ever fall

  @REBL-072
  Scenario: An AI realm raises a lowered tax back in January
    Given a new campaign starts on 11 November 1444 with nobody playing
    And the tax of "Cluj" was lowered to light and nothing keeps it light
    When the AI raises lowered taxes
    Then "Cluj" pays at its realm's rate
    And "Cluj" has a new burden

  @REBL-072
  Scenario: A light-tax charter keeps the tax light
    Given a new campaign starts on 11 November 1444 with nobody playing
    And the tax of "Cluj" was lowered to light and a charter keeps it light for 5 years
    When the AI raises lowered taxes
    Then "Cluj" still pays light tax
