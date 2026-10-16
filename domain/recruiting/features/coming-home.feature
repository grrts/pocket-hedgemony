@context-recruiting
Feature: What recruiting gives back and takes
  As the game
  I want soldiers to leave and return to real provinces
  So that war shows in the streets, markets, farms and births of the realm

  @RECR-060
  Scenario: Streets cleared
    Given the province "Paris" has the state "Homeless"
    When a levy takes homeless men by their share from "Paris"
    Then theft and begging in "Paris" fall
    And the state "Homeless" can end

  @RECR-061
  Scenario: Fewer mouths at home
    Given the province "Troyes" is hungry
    When 1000 men from "Troyes" serve in an army abroad
    Then the province "Troyes" feeds 1000 fewer people

  @RECR-062 @placeholder
  Scenario: Pay spent at home
    Given 2500 soldiers training at "Troyes" are paid 500 gold this month
    When the month ends
    Then 100 gold counts as trade for the market folk of "Troyes"
    And the tax owed by "Troyes" rises by 100 gold

  @RECR-063 @placeholder
  Scenario: Soldier settlers
    Given 500 disbanded men are sent to the frontier province "Frontier" with free tiles
    Then they clear tiles twice as fast as other settlers
    And they become farmers in "Frontier"
    And the province "Frontier" needs one grievance more to riot for 10 years

  @RECR-064 @placeholder
  Scenario: Loot home
    Given an army took 1000 gold of loot and its men came from "Troyes" and "Reims"
    When the army disbands
    Then 100 gold of loot goes to "Troyes" and "Reims"
    And their local store and tax owed rise for a year

  @RECR-065
  Scenario Outline: Coming home to nothing
    Given 1000 men from "Troyes" are disbanded
    And the province "Troyes" has <free> free slots
    When they come home
    Then <slots> men go into the emptiest slots and <homeless> become homeless

    Examples:
      | free | slots | homeless |
      | 1000 | 1000  | 0        |
      | 400  | 400   | 600      |
      | 0    | 0     | 1000     |

  @RECR-066 @placeholder
  Scenario Outline: Armed veterans
    Given an army from "Troyes" disbands
    When the player chooses "<choice>"
    Then <result>

    Examples:
      | choice                | result                                                                                         |
      | Keep the arms         | the arms go back to the store                                                                  |
      | Let them keep them    | the garrison of "Troyes" fights 10 percent better for 5 years and a rising there starts armed and drilled |

  @RECR-067 @placeholder
  Scenario: Sickness brought home
    Given an army ends a plague campaign
    When it disbands into 8 provinces within 3 months
    Then a plague rumour comes home to 2 of those provinces

  @RECR-068
  Scenario: Schools emptied
    Given the province "Paris" has students in its school
    When students are called to arms
    Then research from those students stops
