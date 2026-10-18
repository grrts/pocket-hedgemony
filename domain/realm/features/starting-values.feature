@context-realm
Feature: Starting values rules
  As the game
  I want each country's starting counts to come from the catalogue and the 1444 relations
  So that every campaign starts from history, a little differently each time
  # The data itself belongs to scenario-setup.

  @REALM-130 @REALM-166 @placeholder
  Scenario Outline: Catalogue assessments set starting counts
    # config: starting
    Given the catalogue rates the country "France" on "<assessment>"
    When the campaign starts
    Then that rating sets its <stats>

    Examples:
      | assessment                              | stats                                                  |
      | economic_strength and fiscal_resilience | gold and debt                                          |
      | manpower_potential                      | recruits                                               |
      | military_capability                     | soldiers, commanders and horses                        |
      | naval_capability                        | ships                                                  |
      | administrative_capacity                 | officials and how many provinces start royal           |
      | political_stability and unrest_risk     | lords' starting loyalty and provinces in revolt        |
      | territorial_cohesion                    | number of lords, how much land they hold, and language |
      | institutional_development               | schools, scholars and starting inventions              |
      | trade_access                            | starting traders                                       |
      | diplomatic_influence                    | extra officials at court ready to go abroad as envoys  |

  @REALM-131 @REALM-166 @placeholder
  Scenario: Low confidence widens the random range
    # config: starting.spread_by_confidence
    Given the catalogue has "low" confidence in the country "Kongo"
    When two campaigns start
    Then the starting counts of "Kongo" vary more between them than those of a country with high confidence
    And each count stays within 25 % of its middle value
    And the same seed gives the same counts

  @REALM-132
  Scenario: Relations and lords come from the 1444 files
    Given the relations file "country-relations/data/relations-1444.json"
    When the campaign starts
    Then each country's allies, rivals, subjects and enemies come from it
    And the lords of major countries come from the catalogue's history text

  @REALM-196 @REALM-197 @placeholder
  Scenario: Starting men spread over the realm, with commanders for its strength
    # config: starting_armies
    Given the game starts with the country "France"
    Then every man of "France" is in an army under a commander
    And the armies of "France" stand in different provinces
    And "France" has one commander for each 8,000 men under arms, at least one
    And each commander of "France" leads an army, the first in its capital

  @REALM-230 @placeholder
  Scenario: The world starts each realm from its assessments
    # config: starting
    Given the game starts with the country "France"
    Then "France" starts with 8 months of its tax and trade in gold, within 10 %
    And "France" starts owing half its gold
    And the levies of "France" start between 90 % and all of its levy ceiling
    And "France" starts with 3 envoys at court, each an envoy seat
    And the empty posts of "Castile" are its royal provinces farthest from its capital
    And a realm with no catalogue assessment starts with 50 gold

  @REALM-231
  Scenario: AI realms call men only with someone to lead them
    Given the game starts with the AI country "Castile"
    And every commander of "Castile" leads an army
    When the AI of "Castile" calls up men for a war with 10 gold
    Then the AI of "Castile" calls no men
    But with 200 gold the AI of "Castile" calls men
