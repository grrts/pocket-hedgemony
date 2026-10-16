@context-national-strengths
Feature: Legacies and burdens
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
      | a heyday awake 25 years ends and leaves its mark      |
      | its burden is shed and turned                         |

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
  Scenario: Shedding a burden
    Given the country "Kongo" carries the burden "contested succession" with lords one step less loyal
    When its shed condition holds
    Then the burden is gone
    And the turned legacy "Settled succession" is granted
    And a new ruler or a disputed heir no longer shakes the lords

  @HER-034
  Scenario Outline: Burdens can't be bought off
    Given the country "Poland" carries the burden "elected crown"
    When <attempt>
    Then the burden is <result>

    Examples:
      | attempt                                 | result |
      | "Poland" offers gold to remove it       | kept   |
      | its shed condition holds                | shed   |
      | a reform event applies shed_burden      | shed   |
