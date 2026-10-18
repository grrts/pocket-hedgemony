@context-religion
Feature: Holy places
  As a player
  I want holy places that reward their holder of the same faith and draw war from others
  So that holy places are prizes

  @RELG-080
  Scenario Outline: Holy places in 1444
    When the holy places are loaded for 1444
    Then the holy place "<place>" is sacred to <faiths> and held in 1444 by "<holder>"

    Examples:
      | place                   | faiths                                                  | holder        |
      | Rome                    | catholic                                                | Papal States  |
      | Jerusalem               | catholic, orthodox, oriental_christian, jewish, sunni, shia | Mamluk Sultanate |
      | Mecca and Medina        | sunni, shia, ibadi                                      | Hejaz         |
      | Karbala and Najaf       | shia                                                    | Qara Qoyunlu  |
      | Constantinople          | orthodox                                                | Byzantium     |
      | Echmiadzin              | oriental_christian                                      | Qara Qoyunlu  |
      | Aksum                   | oriental_christian                                      | Ethiopia      |
      | Varanasi                | hindu                                                   | Jaunpur       |
      | Lhasa                   | vajrayana                                               | Tibet         |
      | Temple of the Tooth     | theravada                                               | Kotte         |
      | Mount Wutai             | mahayana                                                | Ming          |
      | Qufu                    | confucian_ritual                                        | Ming          |
      | Ise                     | shinto                                                  | Japan         |
      | Santiago de Compostela  | catholic                                                | Castile       |
      | Bodh Gaya               | theravada, mahayana, vajrayana                          | Jaunpur       |

  @RELG-081 @placeholder
  Scenario: Holding a holy place of your faith
    # config key: holy_place_effects.same_faith
    Given the country "Castile" is catholic and holds "Santiago de Compostela"
    Then "Castile" has 1 more preacher
    And it has the pilgrimage shrine there
    And 200 more traders pass through "Galicia" each year

  @RELG-082 @RELG-110
  Scenario: Holding another faith's holy place
    Given the country "Ottomans" is sunni and holds "Constantinople" after "fall_of_constantinople"
    Then every orthodox ruler may use the war aim "Defend the faith" against "Ottomans" with "Constantinople" as the prize

  @RELG-083 @placeholder
  Scenario Outline: Pilgrims under a ruler of another faith
    # config key: holy_place_effects.pilgrims_still_come_if
    Given the country "Ottomans" holds "Jerusalem"
    And catholic is <policy> in "Ottomans" and "Jerusalem" <house> a catholic house
    Then catholic pilgrim traders <come>

    Examples:
      | policy     | house   | come          |
      | Tolerated  | has     | still come    |
      | Tolerated  | has no  | do not come   |
      | Restricted | has     | do not come   |

  @RELG-084
  Scenario Outline: Amritsar appears with the Panth
    Given the date is <year>
    And the event "sikh_panth_founded" <fired>
    Then "Amritsar" is <holy> a holy place

    Examples:
      | year | fired         | holy |
      | 1570 | has fired     | not  |
      | 1577 | has fired     | now  |
      | 1580 | has not fired | not  |
      | 1580 | has fired     | now  |

  @RELG-085
  Scenario: Church heads' seats are marked
    When the holy places are loaded
    Then the holy places of the Pope, the Ecumenical Patriarch, a Caliph's claim and the Dalai Lama (from 1578) are marked

  @RELG-080 @RELG-126 @placeholder
  Scenario Outline: The Temple of the Tooth follows the relic
    # config key: holy_places.temple_of_the_tooth.moves
    Given the date is <year>
    Then the holy place "Temple of the Tooth" is in the province "<province>"

    Examples:
      | year | province |
      | 1444 | Kotte    |
      | 1591 | Kotte    |
      | 1592 | Kandy    |
