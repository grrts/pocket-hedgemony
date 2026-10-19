@context-tribes
Feature: Hunting grounds
  As a tribal realm
  I want to walk the unowned land next to mine as my hunting grounds
  So that I have room to grow, food for my warriors and furs to trade, without colonising

  @TRIBE-006 @placeholder
  Scenario Outline: Range size by form
    # config key: tribes.range_size
    Given the country "<realm>" has the form "<form>"
    Then the range size of "<realm>" is <size>

    Examples:
      | realm    | form          | size |
      | a clan   | Clan council  | 2    |
      | Creek    | Chiefdom      | 3    |
      | Iroquois | Confederation | 4    |

  @TRIBE-007 @placeholder
  Scenario: The Creek's grounds in 1444
    Given the date is 11 November 1444
    And the country "Creek" has the form "Chiefdom"
    And the unowned land provinces touching the Creek are "Southeast Mississippi" with 52 people, "Southeast Missouri" with 46, "North Mississippi" with 41 and "West Tennessee" with 32
    When a campaign starts
    Then the hunting grounds of "Creek" are "Southeast Mississippi", "Southeast Missouri" and "North Mississippi"

  @TRIBE-007
  Scenario: Two tribes reaching for the same land
    Given the unowned province "Southeast Tennessee" touches both "Cherokee" and "Creek"
    And "Cherokee" comes before "Creek" in nation index
    And "Southeast Tennessee" is the best ground left for both
    When a campaign starts
    Then "Southeast Tennessee" is a hunting ground of "Cherokee"
    And "Creek" takes its next best province instead

  @TRIBE-008 @TRIBE-009 @placeholder
  Scenario: Claiming a ground
    # config key: tribes.claim_months
    Given the country "Cherokee" has 2 of 3 hunting grounds and no claim under way
    And the unowned province "Southeast Tennessee" touches the land of "Cherokee"
    When "Cherokee" claims "Southeast Tennessee" on 1 March 1446
    Then a claim on "Southeast Tennessee" runs until 1 June 1446
    And on 1 June 1446 "Southeast Tennessee" is a hunting ground of "Cherokee"

  @TRIBE-008
  Scenario Outline: A claim that may not be made
    Given the country "Cherokee" is a tribal realm
    And <situation>
    When "Cherokee" tries to claim the province
    Then the claim is refused because <reason>

    Examples:
      | situation                                                    | reason                          |
      | its range has no free place                                  | no free place                   |
      | it already has a claim under way                             | a claim is under way            |
      | the province is a hunting ground of "Creek"                  | it is the Creek's ground        |
      | a colony is being founded in the province                    | a colony is being founded there |
      | the province touches neither its land nor its grounds        | the province is not next to it  |
      | the province is owned by a realm                             | the province is owned           |

  @TRIBE-010 @placeholder
  Scenario: Leaving a ground
    # config key: tribes.reclaim_years
    Given "West Virginia 2" is a hunting ground of "Cherokee"
    When "Cherokee" leaves "West Virginia 2" on 1 May 1450
    Then "West Virginia 2" is no one's hunting ground
    And "Cherokee" may not claim "West Virginia 2" again before 1 May 1455

  @TRIBE-011
  Scenario: A ground that gets an owner
    Given "Southeast Mississippi" is a hunting ground of "Creek"
    When a colony of "Castile" is founded in "Southeast Mississippi"
    Then "Southeast Mississippi" is no longer a hunting ground of "Creek"
    And "Creek" has a free place in its range

  @TRIBE-012
  Scenario: A ground cut off
    Given "West Tennessee" is a hunting ground of "Creek" touching only "North Alabama"
    When "North Alabama" is taken from "Creek" in a peace
    Then at the next monthly step "West Tennessee" is no longer a hunting ground of "Creek"

  @TRIBE-013
  Scenario: A realm that stops being tribal
    Given the country "Creek" holds 3 hunting grounds
    When "Creek" reforms to "Paramount chiefdom"
    Then "Creek" holds no hunting grounds

  @TRIBE-014 @placeholder
  Scenario: Furs and hides
    # config key: tribes.furs_gold
    Given the country "Iroquois" holds 4 hunting grounds
    When a month passes
    Then the treasury of "Iroquois" gains 2 gold on the ledger line "Furs and hides"

  @TRIBE-015
  Scenario Outline: Armies in hunting grounds
    Given "Southwest Québec 4" is a hunting ground of "Iroquois"
    And an army of "<realm>" stands in "Southwest Québec 4"
    Then the army refills its wagons there as in <land>

    Examples:
      | realm                        | land          |
      | Iroquois                     | friendly land |
      | an ally of "Iroquois"        | friendly land |
      | a realm at war with Iroquois | enemy land    |

  @TRIBE-016
  Scenario: Grounds make neighbours
    Given "Southeast Ontario 5" is a hunting ground of "Huron"
    And "Southeast Ontario 5" touches a hunting ground of "Iroquois"
    And the land of "Huron" and "Iroquois" do not touch
    Then "Huron" and "Iroquois" are neighbours

  @TRIBE-017
  Scenario: A ground stays unowned
    Given "Vermont" is a hunting ground of "Iroquois"
    Then "Vermont" pays no tax, needs no official and raises no levy
    And "Vermont" does not count toward world domination for "Iroquois"
    And the people of "Vermont" are a people with no country
