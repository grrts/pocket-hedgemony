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
      | schoolmaster     | language mix moving twice as fast toward the ruler's language and students graduating a year sooner |
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
  Scenario Outline: Officials learn by language
    Given an official of the "<official>" language runs a province of the "<people>" language
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

  @PROV-303
  Scenario: Two officials swap provinces
    Given the province "Troyes" is royal
    And the province "Rouen" is royal
    And a "tax collector" official has served 6 years in "Troyes"
    And a "steward" official has served 3 years in "Rouen"
    When the country "France" moves the official of "Troyes" to "Rouen"
    Then the "tax collector" runs "Rouen" under his own name, at half his effect
    And the "steward" runs "Troyes" under his own name, at half his effect

  @PROV-303
  Scenario: Moving an official into an empty post
    Given the province "Troyes" is royal
    And the province "Rouen" is royal with its post empty
    And a "tax collector" official has served 6 years in "Troyes"
    When the country "France" moves the official of "Troyes" to "Rouen"
    Then the "tax collector" runs "Rouen" at half his effect
    And the post in "Troyes" stands empty

  @PROV-303
  Scenario: A lord's official stays with the lord
    Given the lord "Anjou" holds "Angers" with an official of his own
    When the country "France" tries to move the official of "Angers"
    Then it is refused because he serves the lord, not the crown
    When the country "France" tries to commission the official of "Angers"
    Then it is refused because he serves the lord, not the crown

  @PROV-304
  Scenario: Officials start with years served
    When a new campaign starts
    Then each official has served between 0 and 10 years in his province
    And not every official has served the same number of years

  @PROV-305
  Scenario Outline: Effects that wait for their system
    Given a "<type>" official has served 5 years in "Troyes"
    Then his effect shows as waiting until <system> are in the game

    Examples:
      | type            | system    |
      | master of works | buildings |
      | schoolmaster    | schools   |

  @PROV-306 @PROV-307
  Scenario: Moving an official from his screen
    Given the player opens the official of "Troyes" from the governance card of its province panel
    When the player taps "Move to another province"
    Then a list of the realm's royal provinces shows each one's official, his type and what the move changes
    When the player taps "Rouen"
    Then the two officials swap posts

  @PROV-308
  Scenario: The Officials tab lists every official
    When the player opens the Officials tab of the country card
    Then it lists every official of the realm with his type, province, years served and effect
    And it lists the empty posts

  @PROV-333 @PROV-335 @placeholder
  Scenario: Hiring an official for an empty post
    # config: province.officials.hire.gold
    Given the province "Troyes" is royal
    And the province "Rouen" is royal with its post empty
    And a "steward" official has served 6 years in "Troyes"
    And the country "France" has 60 gold
    When the country "France" hires a "steward" for "Rouen"
    Then the "steward" runs "Rouen" at half his effect
    And the country "France" has 50 gold left
    When the country "France" tries to hire a "judge" for "Angers", held by the lord "Anjou"
    Then it is refused because he serves the lord, not the crown

  @PROV-333 @PROV-334
  Scenario: A type no one serves in comes only from abroad
    Given the province "Rouen" is royal with its post empty
    And no "customs officer" serves in a royal post of "France"
    When the country "France" tries to hire a "customs officer" for "Rouen"
    Then it is refused because no one at home knows the trade
    When the country "France" hires a foreign "customs officer" for "Rouen"
    Then the "customs officer" runs "Rouen" at half his effect

  @PROV-340
  Scenario: A province just taken waits for a decision
    Given the player plays the country "Castile"
    And the player has turned Auto-fill posts off
    When a neighbour hands the country "Castile" one of its provinces
    Then the province's post stands empty
    And End turn waits until the player fills the post, grants it to a lord or keeps it royal

  @PROV-342 @PROV-347 @placeholder
  Scenario: The crown fills its empty posts each month
    # config: province.officials.auto_fill.reserve_gold
    Given the player plays the country "Castile"
    And 3 of its royal posts stand empty and its officials cap has room for them
    And it has gold for two hires and the 10 gold kept back
    When a new month begins
    Then the two posts with the most people are filled by their best fit
    And the treasury keeps at least 10 gold
    And the player reads one line of news naming both hires

  @PROV-342
  Scenario: Auto-fill stays under the officials cap
    Given the player plays the country "Castile"
    And 2 of its royal posts stand empty and its officials cap has room for 1
    When a new month begins
    Then 1 of the two posts is filled

  @PROV-343
  Scenario: The best fit for a province
    Given the player plays the country "Castile"
    And a royal province of "Castile" that is calm, fed, unwalled or inland, and no trade city
    Then its best fit is a tax collector, for its tax a month
    When the province riots
    Then its best fit is a judge, for the riots

  @PROV-344
  Scenario: Land just taken is filled, not waited on
    Given the player plays the country "Castile"
    And it has gold and room under its officials cap
    When a neighbour hands the country "Castile" one of its provinces
    Then the province's post is filled by its best fit
    And End turn does not wait on it

  @PROV-345
  Scenario: Dismissing and replacing an official
    Given the player plays the country "Castile"
    And it has 100 gold
    When the player replaces an official with a native hire of another type serving elsewhere
    Then the new official holds the post in his first year and 10 gold are paid
    When the player dismisses an official
    Then his post stands empty

  @PROV-346
  Scenario: A released commander takes another post
    Given the player plays the country "Castile"
    And an official was commissioned and his post filled since
    When the player releases him with another post empty
    Then he takes that post in his first year

