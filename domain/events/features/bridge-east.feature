@context-events
Feature: Bridge events of 1378 to 1444: the East
  As the game
  I want the history of 1378 to 1444 in the East as conditional events
  So that Kosovo, Timur and Grunwald happen because realms chase their goals, not because of a date

  @EVT-090
  Scenario: The East's bridge events are conditional and in the new age
    Given the East bridge events
    Then every East bridge event belongs to the age "age_of_schism_and_conquerors"
    And no East bridge event is mandatory
    And most East bridge events are approximate

  @EVT-090
  Scenario: The turning points are among them
    Given the East bridge events
    Then the East bridge events include
      | battle_of_kulikovo         |
      | tokhtamysh_burns_moscow    |
      | union_of_krewo             |
      | battle_of_grunwald         |
      | battle_of_kosovo           |
      | battle_of_nikopolis        |
      | battle_of_ankara           |
      | crusade_of_varna           |
      | tokhtamysh_unites_horde    |
      | timur_three_year_campaign  |
      | timur_five_year_campaign   |
      | battle_of_the_terek        |
      | death_of_timur             |
      | kazan_khanate_founded      |
      | crimean_khanate_founded    |

  @EVT-091
  Scenario: They pass the build checks with the campaign's events
    Given the East bridge events
    When the East bridge events are built with the campaign's events
    Then the build reports no error for an East bridge event
    And the East bridge events name no map id that the tree knows by another id
    And every place an East bridge event names is mapped to provinces

  @EVT-092
  Scenario Outline: Campaign events that waited only for 1444 open earlier
    Given the East bridge events
    Then the East copy of "<event>" opens in <year>
    And apart from its age and its earliest year it is the campaign's event

    Examples:
      | event                             | year |
      | fall_of_constantinople            | 1390 |
      | battle_of_mohacs                  | 1400 |
      | union_of_lublin                   | 1386 |
      | ottoman_conquest_of_mamluks       | 1400 |
      | conquest_of_kazan                 | 1438 |
      | kazakh_khanate_founded            | 1428 |
      | shaybanid_conquest_of_transoxiana | 1428 |

  @EVT-093
  Scenario: The Crusade of Varna waits for a war on the Ottoman border
    Given the East bridge events
    And the year is 1434 in the East
    And "hungary" borders "ottoman" in the East
    Then the East event "crusade_of_varna" cannot fire
    When "hungary" and "ottoman" go to war in the East
    Then the East event "crusade_of_varna" can fire for "hungary" as "crusader"
    When "ottoman" holds "province:constantinople" in the East
    Then the East event "crusade_of_varna" cannot fire

  @EVT-093
  Scenario: Before 1425 the crusade does not open
    Given the East bridge events
    And the year is 1420 in the East
    And "hungary" borders "ottoman" in the East
    And "hungary" and "ottoman" go to war in the East
    Then the East event "crusade_of_varna" cannot fire

  @EVT-093
  Scenario: Timur and Tokhtamysh meet on the Terek only at war
    Given the East bridge events
    And the year is 1395 in the East
    And "timurid_empire" borders "golden_horde" in the East
    Then the East event "battle_of_the_terek" cannot fire
    When "timurid_empire" and "golden_horde" go to war in the East
    Then the East event "battle_of_the_terek" can fire for "timurid_empire" as "conqueror"

  @EVT-094
  Scenario: Every East event reads on the card
    Given the East bridge events
    Then every East bridge event has a name and a summary in the localization
    And every option of an East bridge event has a label
    And every East bridge event has two or three options, one of them historical
