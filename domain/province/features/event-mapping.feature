@context-province
Feature: Event-tree province stats become concrete changes
  As the game
  I want event effects on abstract province stats to land as countable changes
  So that the event tree keeps working without abstract meters

  @PROV-270 @open-question
  Scenario Outline: Event effects land as concrete province changes
    # OQ-PROV-16: several rows leave a choice or have no worked effect; OQ-PROV-1 for trade_access
    Given the province "Troyes" is hit by an event effect "<effect>"
    When the game works out the province's stats
    Then the province "Troyes" gets <result>

    Examples:
      | effect                  | result                                             |
      | population −10 %        | people −10 %, townsfolk first in plague events     |
      | prosperity +2           | two new buildings that fit the province            |
      | devastation +30         | 30 % of its tiles burned                           |
      | unrest +20              | one named grievance from the event                 |
      | control −20             | its official fleeing or its road breaking          |
      | fort_level +1           | its castle one step up                             |
      | infrastructure +1       | its road one step up                               |
      | industry +1             | one factory                                        |
      | trade_access −0.2       | traders passing −20 % for the event's duration     |
      | food_security −0.3      | a harvest two steps worse                          |
      | disease_burden +40      | a plague outbreak                                  |

  @PROV-270
  Scenario Outline: Event stats map onto province stats
    Given an event reads the province stat "<event_stat>"
    When the game works out the province's stats
    Then it reads <province_stats>

    Examples:
      | event_stat                   | province_stats                                          |
      | population                   | People                                                  |
      | prosperity                   | buildings and their workers                             |
      | devastation                  | burned tiles                                            |
      | unrest                       | grievances and rebels                                   |
      | control                      | governed by, days to capital and reaches you            |
      | fort_level                   | castle and walls                                        |
      | infrastructure               | road, harbour and bridge                                |
      | industry                     | factories                                               |
      | trade_good                   | wares made                                              |
      | trade_access                 | traders passing                                         |
      | local_supply                 | food from tiles, local store and castle store           |
      | food_security                | food from tiles, local store and castle store           |
      | urbanization                 | townsfolk share                                         |
      | manpower_yield               | recruits here                                           |
      | disease_burden               | plague and fever land                                   |
      | environmental_degradation    | worn tiles and smoke                                    |
      | culture_share                | tongue mix                                              |
      | religion_share               | faith mix                                               |
      | colonial_status              | settlement and governed by                              |
      | terrain                      | ground and tile mix                                     |
      | innovation_presence          | schools and scholars here                               |
