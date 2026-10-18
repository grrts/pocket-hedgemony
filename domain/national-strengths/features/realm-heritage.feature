@context-national-strengths
Feature: Each realm's heritage
  As a player
  I want every realm on the map to carry its own strengths
  So that I can see what it is good at and what holds it back before and while I play it

  @HER-080
  Scenario Outline: A realm takes the heritage of its catalogue record
    Given the realm "<realm>" on the map
    When its strengths are read
    Then its birthright is "<birthright>"
    And its burden is "<burden>"
    And its heydays belong to the <ages>

    Examples:
      | realm    | birthright             | burden                | ages                                                                         |
      | France   | Taille without consent | Princes of the blood  | Age of Gunpowder Empires, Age of Crisis and Absolutism, Age of Revolutions |
      | Ottomans | Kapıkulu household     | Two sultans, one throne | Age of Gunpowder Empires, Age of Reformations, Age of Industrialization    |

  @HER-080
  Scenario: A realm without heritage says so
    Given the realm "Ireland" on the map
    When its strengths are read
    Then it has no heritage and no assessments

  @HER-080
  Scenario: Most realms have heritage
    Given the map's realms
    When their strengths are read
    Then 110 realms have a birthright and every heyday names its age
