@context-diplomacy
Feature: Leagues against a conqueror
  As the countries near a fast conqueror
  I want to band together against it
  So that taking land fast has a price

  @DIPL-157 @placeholder
  Scenario Outline: Who is asked to join, once a year
    # config: leagues.threshold_by_era
    Given the era is "<era>"
    And the country "Venice" has taken <taken> provinces in the last 20 years
    And the country "Milan" borders "Venice" and is not its ally, subject or overlord and not at war with it
    When the yearly league check runs
    Then the country "Milan" <counts> the count "Join a league against Venice"

    Examples:
      | era | taken | counts        |
      | I   | 8     | makes         |
      | I   | 7     | does not make |
      | IV  | 6     | makes         |
      | VI  | 4     | makes         |
      | VI  | 3     | does not make |

  @DIPL-157
  Scenario Outline: Who is not asked
    Given the country "Venice" has taken 10 provinces in the last 20 years
    And the country "C" <relation>
    When the yearly league check runs
    Then the country "C" is not asked to join

    Examples:
      | relation                                                    |
      | is allied with "Venice"                                     |
      | is a subject of "Venice"                                    |
      | is the overlord of "Venice"                                 |
      | is at war with "Venice"                                     |
      | neither borders "Venice" nor a province it took             |

  @DIPL-158 @placeholder
  Scenario: The league count
    # config: leagues
    Given the standing of "Milan" toward "Venice" is -40
    And the country "Venice" took 2 provinces of "Milan"
    And the Lands taken of "Venice" are 9
    And the country "Milan" is a "balancer" and "Venice" has 2 times its soldiers
    And 1 country is already in the league
    And "Milan" and "Venice" share a faith
    When the game evaluates it
    Then the count of "Milan" holds these reasons:
      | reason                       | number |
      | Base                         | -30    |
      | Standing toward X            | 10     |
      | X took our land              | 20     |
      | X's Lands taken              | 27     |
      | X could crush us alone       | 20     |
      | Others already in the league | 5      |
      | Same faith as X              | -10    |
    And the total is 42

  @DIPL-158 @placeholder
  Scenario: Bandwagoners are pushed out by strength
    Given the country "Mantua" is a "bandwagoner" and "Venice" has 3 times its soldiers
    When the game evaluates it
    Then the count of "Mantua" holds "X could crush us alone" at -30

  @DIPL-159
  Scenario Outline: A league needs two members
    Given <yes> countries say yes to a league against "Venice"
    When the game evaluates it
    Then <result>

    Examples:
      | yes | result                                          |
      | 1   | no league exists                                |
      | 2   | the league "League against Venice" exists       |

  @DIPL-160
  Scenario: A league answers only X's attacks
    Given the countries "Milan" and "Florence" are in the league against "Venice"
    When the country "Venice" declares war on "Milan"
    Then the country "Florence" is called defensively
    When the country "Florence" refuses
    Then the country "Florence" leaves the league
    And the country "Florence" gains no Oath broken

  @DIPL-161
  Scenario: A league gives no other protection
    Given the countries "Milan" and "Florence" are in the league against "Venice"
    When the country "Savoy" declares war on "Milan"
    Then the country "Florence" is not called by the league

  @DIPL-162
  Scenario: The conqueror sees the league
    Given the league against "Venice" has the members "Milan" and "Florence"
    When the game evaluates it
    Then the country card of "Venice" shows the league, its members and their soldiers

  @DIPL-163 @placeholder
  Scenario Outline: A league dissolves
    # config: leagues.dissolve_below_share_of_threshold
    Given the era is "I" and a league exists against "Venice"
    When <event>
    Then the league <result>

    Examples:
      | event                                                         | result       |
      | the Lands taken of "Venice" fall to 3                         | dissolves    |
      | the Lands taken of "Venice" fall to 4                         | stays        |
      | "Venice" makes a peace giving provinces back to a member      | dissolves    |

  @DIPL-164 @open-question
  Scenario: An event starts a league regardless of the threshold
    # OQ-DIPL-25: how event leagues end
    Given the country "France" has taken 2 provinces in the last 20 years
    When an event starts a league against "France"
    Then the league against "France" exists
