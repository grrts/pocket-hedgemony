@context-exploration
Feature: The charted map
  As a player or AI country
  I want a map of what my realm has charted, with the rest under the parchment
  So that exploration ships have unknown water to open and charts are worth having

  @EXPL-010 @EXPL-011 @EXPL-055 @placeholder
  Scenario: What a country has charted at the start
    # config: exploration.start_charted_reach
    Given the date is 1444
    When the campaign starts
    Then the country "Portugal" has charted every province within 6 steps of its lands
    And the country "Portugal" has charted every sea zone touching those provinces
    And its charted map is one bit per province and per sea zone

  @EXPL-012
  Scenario: An exploration ship charts as it sails
    Given a Portuguese caravel enters an uncharted ocean zone
    When the zone is entered
    Then the country "Portugal" has charted that zone
    And the country "Portugal" has charted every zone and coastal province next to it

  @EXPL-013
  Scenario Outline: Armies and other fleets chart what is next to them
    Given a Portuguese <mover> stands next to an uncharted <place>
    When the day loop runs
    Then the country "Portugal" has charted that <place>

    Examples:
      | mover          | place    |
      | army           | province |
      | fleet of cogs  | zone     |

  @EXPL-014
  Scenario: Charts are never lost
    Given the country "Portugal" has charted the coast of "Arguin"
    When the country "Portugal" loses every ship and every province near "Arguin"
    Then the country "Portugal" still has charted the coast of "Arguin"

  @EXPL-015
  Scenario: The parchment covers what is uncharted
    Given the country "Castile" has not charted the province "Hispaniola"
    When the player of the country "Castile" looks at the world map
    Then the province "Hispaniola" lies under the parchment

  @EXPL-016
  Scenario Outline: Only exploration ships enter uncharted zones
    Given a Portuguese fleet of <ships>
    When it plans a route through an uncharted zone
    Then the route <result>

    Examples:
      | ships                    | result                              |
      | caravels                 | enters the uncharted zone           |
      | carracks                 | goes round through charted zones only |
      | galleons                 | goes round through charted zones only |
      | caravels and one carrack | goes round through charted zones only |
