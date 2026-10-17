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
      | assessment                                   | stats                                                    |
      | economic_strength and fiscal_resilience      | gold and debt                                            |
      | manpower_potential                           | recruits                                                 |
      | military_capability                          | soldiers, commanders and horses                          |
      | naval_capability                             | ships                                                    |
      | administrative_capacity                      | officials and how many provinces start royal             |
      | political_stability and unrest_risk          | lords' starting loyalty and provinces in revolt          |
      | territorial_cohesion                         | number of lords, how much land they hold, and tongue     |
      | institutional_development                    | schools, scholars and starting inventions                |
      | trade_access                                 | starting traders                                         |
      | diplomatic_influence                         | extra officials at court ready to go abroad as envoys    |

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
