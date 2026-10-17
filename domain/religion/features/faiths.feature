@context-religion
Feature: Faiths, their relations and the 1444 start
  As the game
  I want a fixed list of faiths in families, with layered, rooted and kin relations, and a historical start
  So that every event keeps working and several faiths can live side by side

  @RELG-001 @RELG-002
  Scenario Outline: Faiths and their families
    When the faith list is loaded
    Then the faith "<faith>" belongs to the family "<family>"

    Examples:
      | faith                       | family      |
      | catholic                    | christian   |
      | hussite                     | christian   |
      | oriental_christian          | christian   |
      | ibadi                       | islamic     |
      | jain                        | indic       |
      | vajrayana                   | buddhist    |
      | confucian_ritual            | east_asian  |
      | jewish                      | jewish      |
      | asian_traditional           | traditional |
      | siberian_steppe_traditional | traditional |
      | secular                     | none        |

  @RELG-001
  Scenario: Three faiths added to the event tree's list
    Given the event tree's religions list
    When the faith list is loaded
    Then it also holds "hussite", "jain" and "asian_traditional"

  @RELG-003
  Scenario: A faith shows its local name
    Given the country "Hawaii" has the state faith "pacific_traditional"
    When the player looks at its Faith row
    Then it shows "Hawaiian religion (akua, heiau, kapu)"
    And the engine sees "pacific_traditional"

  @RELG-004
  Scenario Outline: Small faiths stay catalogue minorities
    When the faith list is loaded
    Then "<people>" is not a faith id and stays a named minority in the catalogue

    Examples:
      | people     |
      | Yazidi     |
      | Druze      |
      | Zoroastrian |

  @RELG-005 @RELG-006
  Scenario: Ming is layered, not divided
    Given the country "Ming" has the state faith "confucian_ritual"
    And the province "Beijing" has mahayana and daoist communities of 30 % each without their own houses
    When grievances are worked out
    Then the province "Beijing" has no "Wrong faith" grievance
    And confucian_ritual, mahayana and daoist do not pull against each other

  @RELG-005 @placeholder
  Scenario Outline: A traditional faith layers after 100 years
    # config key: relations.traditional_layers_after_years
    Given the province "Cuzco" has had "indigenous_american" and "catholic" together for <years> years
    Then "indigenous_american" is <layered> with "catholic" in "Cuzco"

    Examples:
      | years | layered    |
      | 99    | not layered |
      | 100   | layered    |

  @RELG-007 @placeholder
  Scenario Outline: Rooted faiths
    # config keys: mix.rooted_hold_per_share, mix.rooted_sacred_places_pull, mix.rooted_sacred_places_min_share
    Given the province "East Bengal" has "asian_traditional" at <share>
    And it has no house of "asian_traditional"
    Then the "asian_traditional" community is served without a house
    And its hold is <hold>
    And its sacred places give <pull> pull

    Examples:
      | share | hold | pull |
      | 0.25  | 2    | 1    |
      | 0.20  | 1.6  | 0    |

  @RELG-008 @placeholder
  Scenario Outline: A kin faith's house serves a small community
    # config key: relations.kin_serves_community_below
    Given the province "Hesse" has a "protestant" church and a "<faith>" community of <share>
    And the faith "<faith>" is Tolerated
    Then the "<faith>" community is <served>

    Examples:
      | faith    | share | served   |
      | anglican | 0.15  | served   |
      | anglican | 0.25  | unserved |
      | catholic | 0.15  | served   |

  @RELG-107 @RELG-108 @placeholder
  Scenario Outline: The start in 1444
    # config key: start
    Given the catalogue faiths file maps "<country>" to the ruler's faith "<ruler>" and the people's majority "<people>"
    When the 1444 start is set up
    Then the state faith of "<country>" is "<ruler>"
    And in its provinces "<ruler>" starts at <ruler_share>

    Examples:
      | country   | ruler    | people              | ruler_share |
      | Delhi     | sunni    | hindu               | 0.15        |
      | Lithuania | catholic | orthodox            | 0.15        |
      | Mali      | sunni    | african_traditional | 0.15        |

  @RELG-107 @placeholder
  Scenario Outline: Region overrides of the start mix
    # config key: start.overrides
    When the 1444 start is set up
    Then <where> starts with <mix>

    Examples:
      | where                                     | mix                                                     |
      | the Balkans under the Ottomans            | orthodox 85 %, sunni 15 %                               |
      | Bohemia                                   | hussite 70 %, catholic 27 %, jewish 3 %                 |
      | Granada                                   | sunni 95 %, jewish 3 %, catholic 2 %                    |
      | the north Java coast                      | hindu 55 %, sunni 25 %, asian_traditional 20 %          |
      | Punjab                                    | hindu 55 %, sunni 45 %                                  |
      | Persia                                    | sunni 80 %, shia 20 %                                   |
      | Egypt                                     | sunni 88 %, oriental_christian 10 %, jewish 2 %         |
      | Polish towns                              | 5 % more jewish                                         |

  @RELG-107 @RELG-125
  Scenario Outline: Records with no faith of their own
    Given the catalogue record "<record>" names its faith "<text>"
    When the 1444 start is set up
    Then the record "<record>" starts with the state faith "<faith>"

    Examples:
      | record             | text      | faith               |
      | wokou              | Mixed     | mahayana            |
      | guanahatabey       | Unknown   | indigenous_american |
      | druze_maan         | Druze     | sunni               |
      | yazidi_communities | Yazidism  | sunni               |
