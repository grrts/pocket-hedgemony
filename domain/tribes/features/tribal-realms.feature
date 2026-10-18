@context-tribes
Feature: Tribal realms and the new tribes of 1444
  As the game
  I want the small peoples of North America that had polities in 1444 to be realms on the map
  So that the land around the first tribes is not empty and a tribe has neighbours to deal with

  @TRIBE-001
  Scenario Outline: Which realms are tribal realms
    Given the country "<realm>" has the form "<form>"
    And the capital of "<realm>" lies in the region "<region>"
    Then "<realm>" is a tribal realm: <tribal>

    Examples:
      | realm    | form               | region                    | tribal |
      | Creek    | Chiefdom           | am_north                  | yes    |
      | Cherokee | Chiefdom           | am_north                  | yes    |
      | Iroquois | Confederation      | am_north                  | yes    |
      | Huron    | Confederation      | am_north                  | yes    |
      | Pueblo   | City commune       | am_north                  | no     |
      | Maya     | Paramount chiefdom | am_mesoamerica_caribbean  | no     |
      | Albania  | Confederation      | eu_balkans_aegean         | no     |

  @TRIBE-002 @TRIBE-003 @placeholder
  Scenario Outline: Small polities of 1444 become realms
    # config keys: tribes.new_tribe_regions, tribes.new_tribe_provinces
    Given the catalogue record "<record>" of region "am_north" is a "decentralized_polity" of tier <tier>
    And the record "<record>" existed on 11 November 1444
    And the home province of "<record>" is owned by no realm
    When a campaign starts
    Then "<record>" is a realm on the map with <provinces> provinces

    Examples:
      | record     | tier | provinces |
      | apalachee  | B    | 2         |
      | calusa     | B    | 2         |
      | lenape     | C    | 1         |
      | timucua    | C    | 1         |

  @TRIBE-002
  Scenario Outline: Peoples and records outside 1444 stay reference data
    Given the catalogue record "<record>" of region "am_north" is a "<representation>"
    When a campaign starts
    Then "<record>" is not a realm on the map

    Examples:
      | record        | representation      |
      | plains_nomads | non_state_actor     |
      | dene          | non_state_actor     |
      | susquehannock | non_state_actor     |
      | paquime       | background_only     |

  @TRIBE-004
  Scenario: A home province already owned keeps the record as reference
    Given the catalogue record "coosa" of region "am_north" is a "decentralized_polity" of tier B
    And the home province of "coosa" is owned by "Creek" in 1444
    When a campaign starts
    Then "coosa" is not a realm on the map
    And "Creek" keeps its provinces

  @TRIBE-005
  Scenario: A new tribe starts like every realm
    Given the catalogue record "lenape" becomes a realm when a campaign starts
    Then its form comes from the start-form rules
    And its tongue, faith, starting numbers and personality come from the rules every realm uses
