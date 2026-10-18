@context-exploration
Feature: Founding a colony
  As a player or AI country
  I want to put a governor ashore and keep the colony fed until its progress reaches 100
  So that the food I ship is the colony's only defence against the locals

  @EXPL-034
  Scenario Outline: Where a colony can be founded
    Given the country "Castile" has a colonial governor aboard a caravel next to the province "<province>"
    And the province "<province>" is <condition>
    When the country "Castile" gives "Found colony"
    Then founding is <result>

    Examples:
      | province     | condition                                              | result  |
      | Small island | charted, coastal, unowned, with free tiles, in range   | allowed |
      | Small island | not charted by Castile                                 | refused |
      | Small island | unowned but every tile worked by its people            | refused |
      | Small island | outside Castile's colonial range                       | refused |
      | Small island | already being founded by Portugal                      | refused |
      | Inland       | not coastal                                            | refused |

  @EXPL-035
  Scenario: Hispaniola is held by Taíno chiefdoms
    Given the province "Hispaniola" is owned by a Taíno chiefdom, a country in the 1444 list
    When the country "Castile" gives "Found colony" there
    Then founding is refused
    And the province "Hispaniola" can only be taken by war or treaty

  @EXPL-036 @EXPL-068
  Scenario: A people with no country keep their tiles
    # A people with no country: no nation on the map owns the province, whatever the catalogue lists there
    Given an unowned coastal province where a people with no country work 6 tiles and 2 tiles are free
    When the country "Castile" founds a colony there
    Then the colony takes only the 2 free tiles
    And the 6 tiles the people work stay theirs

  @EXPL-037 @EXPL-038
  Scenario: Going ashore
    Given a Castilian caravel carrying the colonial governor "Diego de Arana" is in the coastal zone of an unowned island
    When the country "Castile" gives "Found colony"
    Then the governor goes ashore
    And the colony starts at 10 progress
    And its local aggression is rolled at once from the peoples in the province and its neighbours and shown

  @EXPL-038
  Scenario: A coast across one sea zone counts as a neighbour
    Given an unowned island with no people
    And the Taíno live on a coast across one sea zone from it
    When a colony is founded on the island
    Then the Taíno are counted for its local aggression

  @EXPL-039 @placeholder
  Scenario Outline: Local aggression levels
    # config: exploration.aggression, exploration.food_per_month
    Given a colony with people in its province or neighbours
    When its local aggression is rolled "<level>"
    Then it loses on average <loss> progress a month to the locals
    And it takes on average <months> months to reach 100 and needs about <food> rations

    Examples:
      | level    | loss | months | food |
      | Peaceful | 0    | 18     | 360  |
      | Wary     | 1    | 23     | 460  |
      | Hostile  | 2    | 30     | 600  |
      | Fierce   | 3    | 45     | 900  |

  @EXPL-039 @placeholder
  Scenario: The chances of each level
    When local aggression is rolled many times for colonies with people nearby
    Then about 30 percent are Peaceful, 30 percent Wary, 25 percent Hostile and 15 percent Fierce

  @EXPL-040
  Scenario: No people around means Peaceful
    Given an unowned island with no people in it or any neighbour
    When a colony is founded there
    Then its local aggression is "Peaceful"

  @EXPL-041 @EXPL-042 @EXPL-043 @placeholder
  Scenario Outline: A month of founding
    # config: exploration.progress_gain, exploration.food_per_month, exploration.no_food_progress_loss
    Given a colony at <before> progress with <food> rations of colony food
    And its locals' pressure roll this month is <pressure>
    When the month ends
    Then the colony has <after> progress and <left> rations of colony food

    Examples:
      | before | food | pressure | after | left |
      | 58     | 210  | 2        | 61    | 190  |
      | 58     | 210  | 4        | 59    | 190  |
      | 58     | 0    | 2        | 51    | 0    |
      | 10     | 0    | 6        | 0     | 0    |

  @EXPL-042 @EXPL-063 @placeholder
  Scenario Outline: The locals' pressure roll
    # config: exploration.pressure_roll_max_factor
    Given a colony with local aggression "<level>"
    When the locals' pressure is rolled many times
    Then every roll is a whole number from 0 to <max>
    And each number from 0 to <max> comes up about equally often

    Examples:
      | level    | max |
      | Peaceful | 0   |
      | Wary     | 2   |
      | Hostile  | 4   |
      | Fierce   | 6   |

  @EXPL-044 @EXPL-045 @placeholder
  Scenario: Loading colony stores
    Given a Castilian caravel docks in the port "Seville"
    When it loads colony stores
    Then it carries up to 300 rations of colony stores apart from its 60 supply
    And the stores are paid as resupply is paid there: food from the province

  @EXPL-046
  Scenario: Unloading stores needs no port
    Given a Castilian caravel with 300 rations of colony stores in the coastal zone of a colony with 0 colony food
    When the country "Castile" gives "Unload stores"
    Then after one day the colony has 300 rations of colony food

  @EXPL-047 @EXPL-050 @EXPL-051
  Scenario: Progress 100 founds the colony
    Given the country "Castile" founds a colony "New Isabela" at 98 progress with 40 rations of colony food
    And the colonial governor "Diego de Arana" holds slot 1 of 2
    When a month brings its progress to 100
    Then the province "New Isabela" belongs to the country "Castile" with its settlement at "settlement"
    And "Diego de Arana" stays as its official and counts against the officials cap
    And the country "Castile" has 0 of 2 colonial governor slots used
    And the left-over 20 rations go into the province's store
    And the colony is counted by the event tree's colonial presence

  @EXPL-048
  Scenario: Progress 0 loses the colony
    Given the country "Castile" founds a colony at 3 progress with 0 rations of colony food
    When a month brings its progress to 0
    Then the colonial governor dies
    And the colony food is lost
    And his slot frees
    And the province stays unowned

  @EXPL-049
  Scenario: Abandoning a colony
    Given the country "Castile" founds a colony with a caravel in its coastal zone
    When the country "Castile" abandons the colony
    Then the governor goes back aboard the caravel
    And his slot stays used until he is home in a port of the country "Castile"

  @EXPL-049
  Scenario: No ship in the zone, no abandoning
    Given the country "Castile" founds a colony with no ship in its coastal zone
    When the country "Castile" tries to abandon the colony
    Then abandoning is refused

  @EXPL-056
  Scenario: Colonies update once a month
    Given a colony being founded
    When days pass inside a month
    Then its progress and colony food change only at the monthly province update

  @EXPL-037 @EXPL-039 @EXPL-043 @EXPL-046 @EXPL-047 @placeholder
  Scenario: Castile 1493, the second trip and the colony
    Given the country "Castile" has a colonial governor in slot 1 of 2 and a feudal colonial range of 20
    And two caravels load 600 rations of colony stores and the governor
    And they sail to an unowned coast on a small island 17 zones from the Canaries
    When the country "Castile" gives "Found colony"
    And the Taíno across the strait make the roll "Hostile"
    And the caravels unload all 600 rations
    Then the colony gains about 3 progress a month
    And a third caravel brings 300 more rations in year two after a bad run of rolls
    And the colony reaches 100 progress in month 31 and is a Castilian province
    And the governor stays as its official and his slot frees for the next colony

  @EXPL-059
  Scenario: The governor dies of old age while his colony is being founded
    Given the country "Castile" founds a colony at 60 progress with 100 rations of colony food
    When its colonial governor dies of old age
    Then the colony is lost as at progress 0
    And the colony food is lost
    And his slot frees
    And the province stays unowned

  @EXPL-059
  Scenario: A governor at sea dies when his ship sinks
    Given the colonial governor "Diego de Arana" is aboard a caravel of the country "Castile"
    When the caravel sinks
    Then the colonial governor dies
    And his slot frees

  @EXPL-060
  Scenario: Another country gains the province during founding
    Given the country "Castile" founds a colony at 60 progress with 100 rations of colony food
    When an event gives the province to the country "Portugal"
    Then the colony is lost as at progress 0
    And the colonial governor dies

  @EXPL-061
  Scenario: Abandoning loses the food left, and the governor may land elsewhere
    Given the country "Castile" founds a colony at 40 progress with 200 rations of colony food
    And a caravel of the country "Castile" is in its coastal zone
    When the country "Castile" abandons the colony
    Then the 200 rations of colony food are lost
    And the governor may go ashore on another colonisable coast at once with "Found colony"

  @EXPL-051 @EXPL-067
  Scenario: What colonial presence counts
    Given the country "Castile" has founded 2 colonies and holds 1 trading post
    And it is founding a third colony
    When the event tree counts the colonial presence of the country "Castile"
    Then it counts 3
