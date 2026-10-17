@context-revolutions
Feature: The revolution data layer and its build
  As the game's designers
  I want a build that validates the revolution layer and compiles it for the event tree
  So that the event tree's owner gets a checked patch and the engine needs only five new things

  @REVO-079
  Scenario Outline: The engine contract
    Given the revolution patch is merged into the event tree
    When the engine runs a campaign
    Then it can <ability>

    Examples:
      | ability                                                                       |
      | evaluate the conditions grievance, class_share, lords and war_lost            |
      | apply the effects regime and lock                                              |
      | keep the revolution tag on a rising and apply rising_won or rising_crushed     |
      | show the card from the runtime sign data                                       |
      | re-arm a stopped revolution                                                    |

  @REVO-080
  Scenario: The build validates and merges into a scratch copy
    When the revolution build runs
    Then it validates families, regimes against government forms, decrees, every sign leaf and stances
    And it checks that every Fight option raises tagged rebels
    And it merges the layer into a scratch copy of the event tree and runs the event tree's validator
    And it writes the catalogue, the runtime data and the event-tree patch
    And it does not edit the event tree itself

  @REVO-081
  Scenario: The current build result
    When the revolution build runs
    Then it reports 36 revolutions, 33 regimes, 34 decrees and 9 families
    And it reports 0 layer errors
    And the event tree validator on the merged copy reports 0 errors and the same 21 warnings as before

  @REVO-080
  Scenario: A regime naming an unknown form is an error
    Given a regime names the form "imperial_senate" which is not in the government forms
    When the revolution build runs
    Then it reports a layer error for that regime
