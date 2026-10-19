@context-research
Feature: Each realm starts from its start group
  As the game
  I want every realm to start with the knowledge of its part of the world in 1444
  So that starts are historical, complete, and some realms begin behind

  @RSCH-098 @placeholder
  Scenario Outline: Every realm starts from its group
    # config: research.start_groups, research.start_add, research.start_remove
    Given the date is 11 November 1444
    When the country "<country>" is set up from its start group
    Then it belongs to the start group "<group>"
    And it starts knowing <count> inventions besides the root and the boughs
    And it has no study under way

    Examples:
      | country  | group         | count |
      | France   | latin         | 26    |
      | Venice   | latin         | 31    |
      | Ottomans | islamic       | 34    |
      | Ming     | china         | 38    |
      | Oirat    | hordes        | 11    |
      | Mali     | sahel         | 12    |
      | Kongo    | forest_africa | 3     |
      | Inca     | andes         | 10    |
      | Iroquois | north_america | 2     |

  @RSCH-098
  Scenario: Every map nation has exactly one group
    Given the research data with start groups
    When every map nation is looked up
    Then each of the 137 map nations belongs to exactly one start group

  @RSCH-099
  Scenario: Start sets are complete
    Given the research data with start groups
    When every map nation's start set is built
    Then every invention in it has its parent or an alternative and everything it also needs in the same set

  @RSCH-098
  Scenario Outline: Who starts behind
    Given the date is 11 November 1444
    When the country "<country>" is set up from its start group
    Then it <knows> "<invention>"

    Examples:
      | country  | knows          | invention                   |
      | Kongo    | does not start knowing | B1 Stone castles     |
      | Kongo    | starts knowing | B4 Earthwork ring forts     |
      | Benin    | starts knowing | C01 Iron smelting           |
      | Aztecs   | does not start knowing | C01 Iron smelting    |
      | Japan    | does not start knowing | C03 Gunpowder        |
      | Ming     | starts knowing | C03 Gunpowder               |
      | Oirat    | does not start knowing | B02 Dressed stone    |
      | Portugal | starts knowing | S4 Carrack and caravel      |
