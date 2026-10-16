@context-realm
Feature: Women as rulers, lords, commanders, officials and scholars
  As the game
  I want women to hold every role as often as each country's history allows, and more often in later ages
  So that characters follow history
  # Decided 16 October 2026 (gap-lists A.5).

  @REALM-106 @REALM-107
  Scenario Outline: Each country has its own chance per role
    Given the country "<country>" lets a daughter inherit <what>
    When its ruler dies leaving only a daughter
    Then <result>

    Examples:
      | country | what                           | result                                            |
      | Castile | the crown                      | she can become queen regnant                      |
      | Navarre | the crown                      | she can become queen regnant                      |
      | France  | a duchy but not the crown      | she cannot inherit the throne of France           |

  @REALM-107
  Scenario: A duke's daughter inherits his duchy in France
    Given the lord "Brittany" of "France" dies leaving only a daughter
    When his land passes
    Then his daughter becomes the lord of "Brittany"

  @REALM-108
  Scenario: A queen mother can be regent
    Given the ruler of "France" dies and his heir is a child
    When a regent is chosen
    Then the queen mother can be the regent

  @REALM-109 @placeholder @open-question
  Scenario Outline: The chance rises with the ages
    # config: age_multipliers; OQ-REALM-7: values not given, Age of Decolonization out of scope
    Given the event tree's age "<age>" has arrived
    When the game generates a lord for "France"
    Then the chance that she is a woman is multiplied by the factor for "<age>"
    And that factor is <size>

    Examples:
      | age                         | size                       |
      | Age of Revolutions          | a little above 1           |
      | Age of Industrialization    | larger than for Revolutions |
      | Age of World Wars           | larger again               |

  @REALM-109
  Scenario: A reform raises one country's chance early
    Given the country "Sweden" passes a new succession law by an event
    When the game generates a commander for "Sweden"
    Then the chance of a woman is higher for "Sweden" before the ages raise it

  @REALM-110
  Scenario: Real people first
    Given a woman held a role in 1444 in the catalogue's history
    When the campaign starts
    Then she is placed in that role as she was
    And the chance tables apply only to characters the game generates

  @REALM-111 @placeholder
  Scenario: The chances live in config
    Given the realm config
    When the game reads the women-in-roles tables
    Then it finds "women_in_roles" per country or culture for ruler, lord, commander, official and scholar
    And "age_multipliers" per age
