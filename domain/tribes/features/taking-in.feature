@context-tribes
Feature: Taking in a hunting ground
  As a tribal realm
  I want to make a ground I have walked for years a province of mine
  So that my realm grows over land, slowly, without war

  @TRIBE-018 @TRIBE-019 @TRIBE-020 @placeholder
  Scenario: Taking in a ground of the realm's own people
    # config key: tribes.take_in_years
    Given "North Mississippi" has been a hunting ground of "Creek" since 11 November 1444
    And the largest tongue of "North Mississippi" is the tongue of "Creek"
    And "Creek" is at peace
    When "Creek" takes in "North Mississippi" on 1 January 1455
    Then "North Mississippi" is a province of "Creek" with its people, tongue and faith
    And "North Mississippi" needs no official
    And "Creek" has a free place in its range

  @TRIBE-019
  Scenario: Taking in strangers needs an official
    Given "Southeast North Carolina" has been a hunting ground of "Cherokee" for 10 years
    And the largest tongue of "Southeast North Carolina" is not the tongue of "Cherokee"
    When "Cherokee" takes in "Southeast North Carolina"
    Then "Southeast North Carolina" needs an official, counted against the officials cap of "Cherokee"

  @TRIBE-018 @placeholder
  Scenario Outline: Taking in that is not allowed
    Given "East Kentucky" has been a hunting ground of "Cherokee" for <years> years
    And <situation>
    When "Cherokee" tries to take in "East Kentucky"
    Then it is refused because <reason>

    Examples:
      | years | situation                                    | reason                   |
      | 6     | "Cherokee" is at peace                       | held 6 of 10 years       |
      | 12    | "Cherokee" is at war                         | not while at war         |
      | 12    | a colony is being founded in "East Kentucky" | a colony is being founded |
