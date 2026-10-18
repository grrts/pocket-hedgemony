@context-national-strengths
Feature: Birthright
  As a country
  I want one always-on strength rooted in who I am
  So that geography and history shape my play

  @HER-005 @HER-006
  Scenario Outline: A birthright sleeps when its needs fail
    Given the country "Portugal" has the birthright "Sagres pilots" needing a coast on the "atlantic"
    And "Portugal" <coast>
    When the heritage conditions are evaluated
    Then the birthright is <state>

    Examples:
      | coast                                  | state                       |
      | owns a harbour on the Atlantic          | active                      |
      | has lost every Atlantic harbour          | dormant and shown greyed    |
      | regains an Atlantic harbour              | active again                |

  @HER-005
  Scenario: The Sagres pilots birthright
    Given the country "Portugal" has the birthright "Sagres pilots" and owns Atlantic harbours
    When its effects are applied
    Then ships build 15 % faster, storms sink 30 % fewer, sea crossings take 10 % fewer days
    And ports raise 20 % more sailors and fisheries feed 20 % more

  @HER-007
  Scenario: Losing a war never deletes a birthright
    Given the country "Venice" has the birthright "Lagoon and Arsenal"
    When "Venice" loses a war and cedes provinces other than Venice
    Then "Venice" still has the birthright "Lagoon and Arsenal"
