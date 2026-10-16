@context-scenario-setup
Feature: Start forms of government
  As the game
  I want each country to start with its historical form by clear rules
  So that every 1444 realm is governed the way it was

  @SETUP-014 @SETUP-017
  Scenario Outline: Hand-set overrides win
    Given the record "<record>"
    When start forms are assigned
    Then it starts as "<form>"
    And the override's reason is "<why>"

    Examples:
      | record  | form              | why                                                        |
      | ottoman | household_realm   | palace servants (kul), timar grants, open succession among sons |
      | mamluk  | soldier_emirs     | bought soldiers rule; emirs choose the sultan             |
      | venice  | merchant_republic | patriciate, doge for life                                  |
      | england | diet_monarchy     | Parliament grants taxes                                    |
      | hungary | elective_monarchy | diet elects the king; regency of Hunyadi                   |
      | ming    | bureaucratic_empire | examination officials, Six Ministries                    |

  @SETUP-014 @SETUP-016
  Scenario Outline: Text rules apply in order on the government form text
    Given a record of entity type "<type>" with no override whose government form text contains "<text>"
    When start forms are assigned
    Then it starts as "<form>"

    Examples:
      | type     | text                | form              |
      | duchy    | prince-bishop       | prince_bishopric  |
      | kingdom  | elective monarchy   | elective_monarchy |
      | other    | chief               | chiefdom          |
      | sultanate | patrimonial        | household_realm   |

  @SETUP-016
  Scenario: A text rule limited to some types is skipped for others
    Given a record of entity type "kingdom" with no override whose government form text contains "merchant oligarchy"
    When start forms are assigned
    Then the merchant republic text rule does not apply to it

  @SETUP-014
  Scenario Outline: Entity types set the form when no text rule matches
    Given a record of entity type "<type>" with no override and no matching text
    When start forms are assigned
    Then it starts as "<form>"

    Examples:
      | type                 | form             |
      | free_imperial_city   | city_commune     |
      | khanate              | horde            |
      | altepetl             | paramount_chiefdom |
      | mandala_polity       | tribute_empire   |
      | stateless_society    | clan_council     |
      | shugo_domain         | warlord_domain   |
      | trading_post         | colonial_government |

  @SETUP-015
  Scenario Outline: Kingdoms take their form from their region
    Given a record of entity type "kingdom" of tier "<tier>" in the region "<region>" with no override and no matching text
    When start forms are assigned
    Then it starts as "<form>"

    Examples:
      | region                 | tier | form               |
      | eu_france              | A    | feudal_realm       |
      | as_levant_egypt_arabia | B    | household_realm    |
      | as_steppe_siberia      | B    | horde              |
      | as_japan_korea         | B    | warlord_domain     |
      | as_se_asia_mainland    | A    | tribute_empire     |
      | as_se_asia_maritime    | C    | paramount_chiefdom |
      | af_west                | B    | paramount_chiefdom |
      | af_north_sahara        | B    | household_realm    |

  @SETUP-014
  Scenario: A record no rule matches is a chiefdom
    Given a record matched by no override, text rule, entity type or region rule
    When start forms are assigned
    Then it starts as "chiefdom"

  @SETUP-018
  Scenario Outline: Later forms are never start forms
    Given all 963 records
    When start forms are assigned
    Then no record starts as "<form>"

    Examples:
      | form                    |
      | absolute_monarchy       |
      | constitutional_monarchy |
      | constitutional_republic |
      | military_junta          |
      | party_state             |
      | company_rule            |

  @SETUP-019
  Scenario: The summary is generated from the config
    Given the override for "novgorod" is changed in the start-form config
    When the start-form tool is rerun
    Then the start-form summary shows the new form for "novgorod"
