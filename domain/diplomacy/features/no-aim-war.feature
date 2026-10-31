@context-diplomacy
Feature: A war with no aim costs dearly
  As a ruler
  I want a war with no aim to cost me dearly the day I declare it
  So that wars are fought for reasons and a demand comes first

  # Leroy, 20 Oct (F-167). Config: diplomacy.war_aims.no_aim_penalty

  @DIPL-247 @placeholder
  Scenario: Lords turn the day a war with no aim is declared
    Given the country "France" holds no aim against "Savoy"
    And France has the Loyal lord "Duke of Bourbon", the Warlike Loyal lord "Count of Foix" and the Wavering lord "Duke of Orléans"
    When France declares war on "Savoy" with no aim
    Then every lord of France is Disloyal that same day

  @DIPL-248 @placeholder
  Scenario: The name abroad darkens
    Given the country "France" holds no aim against "Savoy"
    When France declares war on "Savoy" with no aim
    Then France's notoriety rises by 15
    And every realm that knows France holds the wrong "Notorious deed" toward it

  @DIPL-249
  Scenario: An unjust war while it lasts
    Given the country "France" declared war on "Savoy" with no aim
    Then every province of France holds the grievance "Unjust war"
    When the war ends
    Then no province of France holds the grievance "Unjust war"

  @DIPL-250 @placeholder
  Scenario: Peace voices lean to peace
    Given the country "France" declared war on "Savoy" with no aim
    When France's peace voices are counted
    Then 25 in 100 more of them say peace than in a war with an aim

  @DIPL-251
  Scenario: Allies stay out
    Given the country "France" is allied with the AI country "Milan"
    When France declares war on "Savoy" with no aim
    Then Milan refuses the call to arms
    And France and Milan stay allied with no oath broken

  @DIPL-252
  Scenario Outline: The AI keeps from wars with no aim
    Given the AI country "Poland" holds no aim against "Lithuania" and could win a war
    And Poland's ruler is <ruler>
    When Poland weighs a war on Lithuania
    Then Poland <declares>

    Examples:
      | ruler                       | declares                     |
      | not Warlike                 | makes a demand first or waits |
      | Warlike                     | may declare                  |

  @DIPL-252
  Scenario: A rising pays nothing
    Given the Disloyal subject "Wallachia" rises against "Hungary"
    Then no lord of Wallachia loses loyalty for it

  @DIPL-253 @DIPL-255
  Scenario: The declare sheet shows the cost
    Given the player's realm "France" holds no aim against "Savoy"
    When the player opens the declare sheet against "Savoy"
    Then a block "A war with no aim" heads the Price of war with the rows "Your lords", "Your name abroad", "Your people", "Peace voices" and "Neighbours alarmed"
    And each row is at least 44 points tall and opens its reason on a tap
    And Confirm reads "Declare war with no aim"
