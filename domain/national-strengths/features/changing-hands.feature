@context-national-strengths
Feature: Heritage when countries change hands
  As a conqueror, a subject or a new country
  I want clear rules for what happens to heritage
  So that ruling a land for a generation lets me grow into it

  @HER-059 @HER-060 @placeholder
  # config: inheritance.claim_years
  Scenario Outline: An inherited birthright
    Given the country "Ottoman" annexed "Byzantium" in 1453
    And "Ottoman" has held Constantinople and most of the Byzantine homeland for <years> years
    When the heritage conditions are evaluated
    Then the Byzantine birthright is <state>

    Examples:
      | years | state                                       |
      | 10    | a dormant claim                             |
      | 29    | a dormant claim                             |
      | 30    | awake as the second birthright of "Ottoman" |

  @HER-060
  Scenario: At most two birthrights
    Given the country "Ottoman" has 2 birthrights
    When another annexed birthright would wake
    Then "Ottoman" still holds at most 2 birthrights

  @HER-061
  Scenario: Subjects keep their heritage
    Given "Wallachia" becomes a subject of "Hungary"
    When heritage is applied
    Then "Wallachia" keeps its whole heritage
    And the legacies of "Hungary" do not apply to "Wallachia"

  @HER-062
  Scenario Outline: Released countries
    Given the country "<country>" is released
    And it <in_catalogue> in the catalogue
    When its heritage is set
    Then it gets <heritage>

    Examples:
      | country  | in_catalogue | heritage                                  |
      | Brittany | is           | its catalogue heritage                    |
      | Newland  | is not       | the generated heritage of its archetype   |

  @HER-063
  Scenario: Formed countries
    Given "Castile" and "Aragon" form "Spain" by event
    When the heritage of "Spain" is set
    Then it keeps the birthright and legacies of the forming country
    And it adds the heritage of "Spain" if it has its own
    And it draws ambitions from both pools

  @HER-063
  Scenario: A formed country keeps at most two birthrights
    Given "Castile" holds its own birthright and one inherited from "Granada"
    When "Castile" forms "Spain", which has a birthright of its own
    Then "Spain" holds 2 birthrights: the own birthright of "Castile" and its own
    And the birthright inherited from "Granada" is a dormant claim of "Spain" again
