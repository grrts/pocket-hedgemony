@context-scenario-setup
Feature: African starts
  As a player starting in Africa
  I want the realms and peoples that held Africa in 1444 on the map around me
  So that my realm has neighbours to win over, trade with and fight, and a real chance to play well

  @SETUP-060
  Scenario Outline: The catalogue's African countries and subjects are on the map
    Given the catalogue record "<record>" of the region "<region>" is a <representation>
    When the starting world is built
    Then "<record>" is a realm on the map with a capital, a colour and a commander

    Examples:
      | record  | region            | representation   |
      | oyo     | af_west           | playable country |
      | loango  | af_central_south  | playable country |
      | buganda | af_northeast_east | playable country |
      | sine    | af_west           | playable subject |

  @SETUP-061
  Scenario Outline: Stateless peoples with a homeland become small realms
    Given the catalogue record "<record>" is a <representation> with a homeland on unowned land
    When the starting world is built
    Then "<record>" is a realm on the map
    And its start form comes from the start-form rules

    Examples:
      | record                       | representation       |
      | igbo_societies               | decentralised polity |
      | voltaic_stateless_societies  | decentralised polity |
      | nguni                        | decentralised polity |
      | san                          | non-state actor      |

  @SETUP-061
  Scenario Outline: Migrations, raiders and background records stay reference data
    Given the catalogue record "<record>" is <kind>
    When the starting world is built
    Then "<record>" is reference data and not a realm

    Examples:
      | record             | kind                         |
      | fulbe_pastoralists | a migration non-state actor  |
      | juhayna_arabs      | a migration non-state actor  |
      | bambuk             | background only              |

  @SETUP-062
  Scenario Outline: A playable subject starts under the overlord the relations file names
    Given the relations file names "<overlord>" as the overlord of "<subject>"
    When the starting world is built
    Then "<subject>" is a subject of "<overlord>"

    Examples:
      | subject | overlord |
      | sine    | jolof    |
      | sofala  | kilwa    |
      | hadiya  | ethiopia |

  @SETUP-063 @placeholder
  Scenario Outline: New nations take unowned land around their capitals by size
    Given the new African nation "<record>" has manpower potential "<level>" and no owner rule
    When the starting world is built
    Then "<record>" owns <provinces> provinces, all of them unowned before
    And each of them is joined to its capital through its own land

    Examples:
      | record         | level     | provinces |
      | kitara         | moderate  | 3         |
      | buganda        | low       | 2         |
      | san            | very low  | 1         |
      | igbo_societies | moderate  | 3         |

  @SETUP-063
  Scenario: New nations grow one province a round in turn
    Given two new African nations whose capitals border the same unowned province
    When the starting world is built
    Then the nation with the lower nation index takes it in the first round
    And the other nation takes another unowned neighbour in the same round

  @SETUP-063
  Scenario: A new nation's own owner rule comes before a broad rule
    Given an owner rule of the new nation "katsina" names the province a broad rule gives "kano"
    When the starting world is built
    Then "katsina" owns that province and "kano" keeps its capital
    And every province keeps the id it had before the new nations were added

  @SETUP-064
  Scenario: A capital inside another realm leaves the record as reference data
    Given the catalogue record "kayor" has its capital in a province the realm "jolof" owns
    And no owner rule gives "kayor" land
    When the starting world is built
    Then "kayor" is reference data and not a realm
    And the map build's report lists "kayor"

  @SETUP-065
  Scenario: Land left over stays free and colonisable
    Given a sub-Saharan coastal province that no new nation reached
    When the starting world is built
    Then it is owned by no country and has no castle
    And a colonial governor may found a colony there on its free tiles

  @SETUP-066
  Scenario: A new nation gets a colour and a commander
    Given the new African nation "oyo"
    When the starting world is built
    Then its colour is not taken by a neighbouring nation
    And it has one commander named from its tongue's name list

  @SETUP-067
  Scenario Outline: Sub-Saharan castles are earthworks except named stone castles
    Given the sub-Saharan province <province>
    When the starting world is built
    Then its castle is <castle>

    Examples:
      | province                                         | castle                  |
      | that is the capital of "oyo"                     | an earthwork ring fort  |
      | that is the capital of "mali"                    | an earthwork ring fort  |
      | that an anchor names as the stone castle "Great Zimbabwe" | a stone castle |
      | on a frontier with 250 thousand people           | none or an old ring fort |

  @SETUP-068
  Scenario Outline: Gold fields and trade towns are anchored
    Given the geography anchor "<place>"
    When the starting world is built
    Then the province of "<place>" has <what>

    Examples:
      | place    | what                                  |
      | Bambuk   | a gold mine                           |
      | Bure     | a gold mine                           |
      | Timbuktu | a Sahel trade town                    |
      | Kilwa    | its 1444 port tier and a stone castle |

  @SETUP-069
  Scenario: African nations start by the same rules as every realm
    Given the new African nation "benin" and the realm "Hungary" with the same assessments
    When the starting world is built
    Then both get their starting counts from the same factors
    And neither has a bonus or penalty of its own

  @SETUP-070 @placeholder
  Scenario: Balance targets for African starts
    Given seeded AI-only campaigns run to 1600
    When the balancing model checks African starts
    Then at least a quarter of the African nations of 1444 still exist in 1600
    And no one realm holds more than a third of the settled sub-Saharan provinces
    And at most 15 % of sub-Saharan coastal provinces are other continents' colonies
    And in at least one run a clan council or chiefdom of one or two provinces owns five or more by 1550

  @SETUP-072
  Scenario: Choosing a region lists every realm in it
    Given the realm picker is open
    When the player picks the region filter "Sub-Saharan Africa"
    Then the map zooms to Sub-Saharan Africa
    And the list shows every realm of the region by name, one row each

  @SETUP-073
  Scenario: The realm card shows how the realm can grow
    Given the realm picker is open
    When the player taps the realm "Oyo"
    Then its card shows its form, provinces, people and strengths
    And a Ways to grow line counts its smaller neighbours, the free land that borders it and its trade

  @SETUP-074
  Scenario: African starts join the suggested realms
    Given the realm picker is open
    Then the suggested realms include "Mali", "Benin", "Kongo", "Ethiopia" and "Kilwa"
