@context-province
Feature: Officials and their types
  As a player or AI country
  I want each official to have a type with its own effect where assigned
  So that choosing which official goes where matters

  @PROV-190 @placeholder
  Scenario Outline: Each type has its own effect in the province it runs
    # config: province.officials.effects
    Given the province "Troyes" is royal
    And a "<type>" official has served 5 years in "Troyes"
    When the game works out the province's stats
    Then the province "Troyes" gets <effect>

    Examples:
      | type             | effect                                                                                  |
      | tax collector    | +20 % of tax owed reaching you                                                          |
      | steward          | +10 % food from the tiles and a local store that rots half as fast                      |
      | judge            | riots needing one grievance more and Broken charter fading twice as fast                |
      | master of works  | buildings and roads 25 % cheaper and twice as fast, and burned tiles rebuilt twice as fast |
      | muster master    | recruits refilling 25 % faster                                                          |
      | customs officer  | +15 % trade ratio gain                                                                  |
      | chaplain         | faith mix moving twice as fast toward the ruler's faith                                 |
      | schoolmaster     | tongue mix moving twice as fast toward the ruler's tongue and students graduating a year sooner |
      | warden           | a garrison fighting 25 % better, walls repairing twice as fast and a castle store rotting half as fast |
      | colonial governor | no effect of its own                                                                   |

  @PROV-191
  Scenario: One official runs one province, and a seat needs its own
    Given the country "France" has 1 free official
    And the province "Lyon" has a seat
    When the country "France" assigns the official to "Lyon"
    Then the official runs the province "Lyon"
    And the seat in "Lyon" still needs an official of its own

  @PROV-192 @placeholder
  Scenario Outline: Officials grow into their province
    # config: province.officials.full_effect_years
    Given a "tax collector" official has served <years> years in "Troyes"
    When the game works out the province's stats
    Then he gives <effect> of his effect

    Examples:
      | years | effect                 |
      | 0     | half                   |
      | 5     | all                    |

  @PROV-192
  Scenario: Moving an official starts him again at half
    Given a "tax collector" official has served 6 years in "Troyes"
    When the country "France" moves him to "Rouen"
    Then he gives half of his effect in "Rouen"

  @PROV-193
  Scenario: A colonial governor founds a colony and then runs it
    Given the country "Portugal" has a free colonial governor slot
    And a colonial governor holds that slot
    Then he does not count against the officials cap
    When his colony is founded
    Then he becomes the colony's ordinary official
    And he counts against the officials cap

  @PROV-194
  Scenario Outline: Schools train officials of certain types
    Given the country "France" has a <school>
    When a scholar graduates and becomes an official
    Then he may be a <types>

    Examples:
      | school     | types                              |
      | madrasa    | judge or chaplain                  |
      | university | judge or steward                   |
      | academy    | master of works or warden          |

  @PROV-194
  Scenario Outline: Officials are gained and lost
    Given the country "France" has 40 officials
    When <cause>
    Then the country "France" has <count> officials

    Examples:
      | cause                                                       | count |
      | it hires a steward for gold up front                       | 41    |
      | a lord's line dies out and his one official enters service | 41    |
      | an official dies of old age                                | 39    |
      | it dismisses a judge                                       | 39    |
      | it leaves wages unpaid and one official leaves             | 39    |
      | rebels take a province and kill its official               | 39    |
      | a richer neighbour hires one away                          | 39    |

  @PROV-194
  Scenario: A foreign specialist costs more
    Given the country "France" has gold to hire an official
    When the country "France" hires a foreign master of works
    Then it pays more than for a native master of works

  @PROV-195
  Scenario: The country card's officials count is the sum of the realm's officials
    Given the country "France" has 18 officials in royal provinces and 22 elsewhere in its service
    When the game works out the province's stats
    Then the country card shows 40 officials

  @PROV-299 @placeholder
  Scenario Outline: Officials learn by tongue
    Given an official of the "<official>" tongue runs a province of the "<people>" tongue
    Then he learns the province in <years> years

    Examples:
      | official | people  | years |
      | French   | French  | 5     |
      | French   | Picard  | 7     |
      | French   | Breton  | 10    |

  @PROV-191
  Scenario Outline: How many provinces one official runs
    Given the country "France" knows <inventions>
    Then one official runs <count> provinces

    Examples:
      | inventions    | count |
      | G1            | 1     |
      | G1 and G9     | 2     |
      | G9 and G16    | 3     |
      | G9 and G11    | 3     |
