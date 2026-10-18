@context-national-strengths
Feature: Legacies and weaknesses
  As a country
  I want permanent rewards for what I achieved and a weakness I can overcome
  So that the campaign leaves its mark

  @HER-029
  Scenario Outline: Three ways to earn a legacy
    Given the country "Kongo" has heritage
    When <way>
    Then "Kongo" gains a permanent legacy

    Examples:
      | way                                                   |
      | an ambition is done                                   |
      | a golden age active 25 years ends and leaves its mark |
      | its weakness is overcome and turned                   |

  @HER-030
  Scenario: A sixth legacy
    Given the country "Castile" holds 5 legacies
    When it earns a sixth
    Then the player is asked which one to let go
    And "Castile" holds 5 legacies

  @HER-031 @placeholder
  Scenario: Great legacies
    Given the ambition "Beyond the Cape of Storms" rewards the great legacy "Estado da Índia"
    When the heritage is built
    Then "Estado da Índia" may spend 3 points instead of 2
    And it gives one more trader and customs officers 20 % stronger on the coast

  @HER-032 @HER-033
  Scenario: Overcoming a weakness
    Given the country "Kongo" has the weakness "contested succession" with lords one step less loyal
    When the condition to overcome it holds
    Then the weakness is gone
    And the turned legacy "Settled succession" is granted
    And a new ruler or a disputed heir no longer shakes the lords

  @HER-034
  Scenario Outline: Weaknesses can't be bought off
    Given the country "Poland" has the weakness "elected crown"
    When <attempt>
    Then the weakness is <result>

    Examples:
      | attempt                                 | result   |
      | "Poland" offers gold to remove it       | kept     |
      | the condition to overcome it holds      | overcome |
      | a reform event applies shed_burden      | overcome |
