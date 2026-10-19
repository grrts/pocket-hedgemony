@context-government
Feature: Starting government forms in 1444
  As the game
  I want every catalogue record to start in its historical government form with its historical lords
  So that 1444 looks like history before the player acts

  @GOV-043
  Scenario Outline: The first matching rule sets the start form
    Given the catalogue record "<record>" has the entity type "<entity_type>" and the government text "<text>"
    When start forms are assigned
    Then the record "<record>" starts as "<form>" by the rule "<rule>"

    Examples:
      | record          | entity_type      | text                              | form                | rule              |
      | ottoman         | empire           | patrimonial sultanate             | Household realm     | override          |
      | mamluk          | sultanate        | military slave elite              | Soldier emirs       | override          |
      | venice          | republic         | patrician republic                | Merchant republic   | override          |
      | hungary         | kingdom          | elective kingship                 | Elective monarchy   | override          |
      | rec_bishop      | electorate       | ecclesiastical electorate         | Prince-bishopric    | text              |
      | rec_elective    | kingdom          | elective monarchy                 | Elective monarchy   | text              |
      | rec_kingdom     | kingdom          | hereditary monarchy               | Feudal realm        | kingdom_by_region |
      | rec_electorate  | electorate       | margravial rule                   | Feudal realm        | entity_type       |
      | some_record     | unknown_type     | unknown                           | Chiefdom            | default           |

  @GOV-043
  Scenario Outline: Hand-set overrides with their reasons
    Given the catalogue record "<record>" is in the overrides list
    When start forms are assigned
    Then the record "<record>" starts as "<form>"

    Examples:
      | record          | form                |
      | ottoman         | Household realm     |
      | muscovy         | Household realm     |
      | safaviyya       | Holy rule           |
      | ming            | Bureaucratic empire |
      | joseon          | Bureaucratic empire |
      | dai_viet        | Bureaucratic empire |
      | mamluk          | Soldier emirs       |
      | england         | Diet monarchy       |
      | aragon          | Diet monarchy       |
      | poland          | Elective monarchy   |
      | hre             | Elective monarchy   |
      | uri             | Peasant commune     |
      | iceland         | Peasant commune     |
      | hanseatic_league | Confederation      |
      | ashikaga        | Shogunate           |
      | inca            | Tribute empire      |
      | songhai         | Paramount chiefdom  |
      | kongo           | Paramount chiefdom  |
      | ethiopia        | Feudal realm        |
      | papal_states    | Holy rule           |
      | teutonic_order  | Military order      |
      | great_horde     | Horde               |
      | kazan           | Horde               |
      | silesia         | Confederation       |
      | qara_qoyunlu    | Horde               |

  @GOV-043 @GOV-045
  Scenario Outline: Kingdoms by region
    Given the catalogue record "<record>" is a kingdom in the region "<region>" with detail tier "<tier>"
    And no override or text rule applies to "<record>"
    When start forms are assigned
    Then the record "<record>" starts as "<form>"

    Examples:
      | record    | region                 | tier | form               |
      | k_eu      | eu_iberia              | A    | Feudal realm       |
      | k_cauc    | as_anatolia_caucasus   | B    | Feudal realm       |
      | k_arabia  | as_levant_egypt_arabia | C    | Household realm    |
      | k_iran    | as_iran_transoxiana    | C    | Household realm    |
      | k_sasia   | as_south_asia_north    | B    | Feudal realm       |
      | k_china   | as_china_inner_asia    | C    | Feudal realm       |
      | k_steppe  | as_steppe_siberia      | C    | Horde              |
      | k_japan   | as_japan_korea         | C    | Warlord domain     |
      | k_sea_a   | as_se_asia_mainland    | A    | Tribute empire     |
      | k_sea_c   | as_se_asia_mainland    | C    | Paramount chiefdom |
      | k_nafr    | af_north_sahara        | B    | Household realm    |
      | k_wafr    | af_west                | B    | Paramount chiefdom |
      | k_meso    | am_mesoamerica         | B    | Paramount chiefdom |
      | k_oc      | oc_polynesia           | C    | Paramount chiefdom |
      | k_other   | xx_unlisted            | C    | Feudal realm       |

  @GOV-044
  Scenario Outline: Text rules limited by entity type
    Given the catalogue record "<record>" has the entity type "<entity_type>" and the government text "<text>"
    And no override applies to "<record>"
    When start forms are assigned
    Then the record "<record>" starts as "<form>"

    Examples:
      | record      | entity_type | text                          | form             |
      | rec_a       | theocracy   | archbishop's rule             | Holy rule        |
      | rec_b       | other       | acephalous village council    | Clan council     |
      | rec_c       | duchy       | village council               | Feudal realm     |
      | rec_d       | other       | headman of the valley         | Chiefdom         |
      | rec_e       | other       | regional administration       | Colonial government |

  @GOV-043
  Scenario Outline: Entity types
    Given the catalogue record "<record>" has the entity type "<entity_type>" and a government text no rule matches
    And no override applies to "<record>"
    When start forms are assigned
    Then the record "<record>" starts as "<form>"

    Examples:
      | record | entity_type                | form                |
      | r1     | empire                     | Household realm     |
      | r2     | duchy                      | Feudal realm        |
      | r3     | prince_archbishopric       | Prince-bishopric    |
      | r4     | imamate                    | Holy rule           |
      | r5     | military_order             | Military order      |
      | r6     | free_imperial_city         | City commune        |
      | r7     | peasant_republic           | Peasant commune     |
      | r8     | league                     | Confederation       |
      | r9     | beylik                     | Household realm     |
      | r10    | khanate                    | Horde               |
      | r11    | sheikhdom                  | Chiefdom            |
      | r12    | altepetl                   | Paramount chiefdom  |
      | r13    | mandala_polity             | Tribute empire      |
      | r14    | stateless_society          | Clan council        |
      | r15    | shugo_domain               | Warlord domain      |
      | r16    | trading_post               | Colonial government |

  @GOV-046
  Scenario Outline: Lords at the start
    Given the country "<country>" has <provinces> provinces in 1444
    And the catalogue lists <houses> historical houses for "<country>"
    When the 1444 start is set up
    Then the country "<country>" starts with <lords> lords

    Examples:
      | country            | provinces | houses | lords |
      | Testland           | 5         | 3      | 3     |
      | a one-province count | 1       | 2      | 0     |

  @GOV-047
  Scenario: The 1444 caps follow from the start buildings
    Given the buildings design sets the start buildings of "France"
    When the 1444 start is set up
    Then the caps of "France" are worked out from its start form and those buildings

  @GOV-048
  Scenario Outline: Forms no country starts with
    When start forms are assigned
    Then no record starts as "<form>"

    Examples:
      | form                    |
      | Absolute monarchy       |
      | Constitutional monarchy |
      | Constitutional republic |
      | Military junta          |
      | Party state             |
      | Company rule            |
