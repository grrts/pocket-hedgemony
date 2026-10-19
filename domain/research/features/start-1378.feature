@context-research
Feature: Era I from the start, and a campaign that starts in 1378
  As the game
  I want Era I to run from the start and a 1378 start to know what the world knew in 1378
  So that a campaign from 20 September 1378 plays the tree as it is, and a 1444 campaign plays exactly as now

  @RSCH-113 @placeholder
  Scenario Outline: Era I is paced to the start
    # config: research.era_pace
    Given the campaign starts in <year>
    Then Era I's cost is multiplied by <pace>
    And an invention of era I costs <cost> scholar-years before discounts
    And an invention of era II costs 80 scholar-years before discounts

    Examples:
      | year | pace | cost  |
      | 1444 | 1    | 20    |
      | 1378 | 2.18 | 43.57 |

  @RSCH-114
  Scenario: A 1444 start has no block
    Given the campaign starts on 11 November 1444
    When every map nation is set up for that start
    Then each knows what the 1444 start groups give it

  @RSCH-114 @placeholder
  Scenario Outline: The realms of 1378 join start groups
    # config: research.starts.1378.join
    Given the campaign starts on 20 September 1378
    When the country "<country>" is set up from its start group
    Then it belongs to the start group "<group>"

    Examples:
      | country          | group         |
      | Jalayirids       | islamic       |
      | Germiyan         | islamic       |
      | Hormuz           | islamic       |
      | Great Horde      | hordes        |
      | White Horde      | hordes        |
      | Timurids         | khanates      |
      | Sufids           | khanates      |
      | Korea            | korea         |
      | Maya             | mesoamerica   |
      | Tepanecs         | mesoamerica   |
      | Bulgaria Tarnovo | orthodox      |
      | Morea            | orthodox      |
      | Visconti Pavia   | latin         |
      | Flanders         | latin         |
      | Avignon Papacy   | latin         |
      | Lithuania        | latin         |

  @RSCH-114
  Scenario: The 1378 block may name realms not yet on the map
    Given the research data with start groups
    When the 1378 block is checked against the map
    Then every realm it names joins a start group that exists
    And the realms it names that are not yet map nations are only checked once the map has them

  @RSCH-114 @RSCH-099
  Scenario: 1378 start sets are complete
    Given the campaign starts on 20 September 1378
    When every 1378 realm's start set is built
    Then every invention in it has its parent or an alternative and everything it also needs in the same set

  @RSCH-115 @placeholder
  Scenario Outline: What a realm knows in 1378
    # config: research.starts.1378.add, research.starts.1378.remove
    Given the campaign starts on 20 September 1378
    When the country "<country>" is set up from its start group
    Then it <knows> "<invention>"

    Examples:
      | country    | knows                  | invention                   |
      | Ottomans   | does not start knowing | W3 Bombards                 |
      | Ottomans   | does not start knowing | W5 gunpowder_infantry       |
      | Ottomans   | does not start knowing | G3 Tax registers            |
      | France     | starts knowing         | W3 Bombards                 |
      | Venice     | starts knowing         | W3 Bombards                 |
      | France     | does not start knowing | W5 gunpowder_infantry       |
      | Ming       | starts knowing         | W3 Bombards                 |
      | Ming       | starts knowing         | W5 gunpowder_infantry       |
      | Ming       | starts knowing         | W4 Wagon fort               |
      | Ming       | does not start knowing | G3 Tax registers            |
      | Venice     | starts knowing         | G3 Tax registers            |
      | Bohemia    | does not start knowing | W4 Wagon fort               |
      | Hungary    | does not start knowing | W4 Wagon fort               |
      | Portugal   | does not start knowing | S4 Carrack and caravel      |
      | Castile    | does not start knowing | S4 Carrack and caravel      |
      | Genoa      | starts knowing         | S4 Carrack and caravel      |
      | Timurids   | does not start knowing | L3 Observatories            |
      | Jalayirids | starts knowing         | L3 Observatories            |
      | Korea      | starts knowing         | L4 Metal movable type       |
      | Florence   | does not start knowing | L6 humanist_learning        |

  @RSCH-097 @RSCH-114 @placeholder
  Scenario Outline: Standing in 1378
    # config: research.standing_share
    Given the campaign starts on 20 September 1378
    When the country "<country>" is set up from its start group
    Then its standing is "<standing>"
    And it is behind the times by <eras> eras

    Examples:
      | country     | standing | eras |
      | France      | Era I    | 0    |
      | Ottomans    | Era I    | 0    |
      | Jalayirids  | Era I    | 0    |
      | Ming        | Era I    | 0    |
      | Timurids    | Medieval | 1    |
      | White Horde | Medieval | 1    |
      | Sukhothai   | Medieval | 1    |
      | Mali        | Ancient  | 2    |
      | Tepanecs    | Ancient  | 2    |

  @RSCH-113 @placeholder
  Scenario Outline: A 1444 campaign keeps its costs, and a 1378 one pays Era I's pace
    # config: research.era_pace
    Given the campaign starts on <start>
    When the country "France" is set up from its start group
    And it tries to study "L5 printing" in <year>
    Then the study costs <cost> scholar-years

    Examples:
      | start             | year | cost  |
      | 11 November 1444  | 1450 | 20    |
      | 20 September 1378 | 1400 | 43.57 |
