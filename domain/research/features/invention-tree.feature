@context-research
Feature: One invention tree
  As the game
  I want a single tree from one root that grows back into itself across boughs
  So that no country can climb far up one side without reaching across

  @RSCH-040 @RSCH-041
  Scenario: One root, four boughs, letters are only labels
    Given the invention tree config
    When the tree is loaded
    Then it has one root "Settled life" with the boughs R1 "Tilling and building", R2 "Fire and metal", R3 "Counting and records" and R4 "Boats"
    And "W10 Supply magazines" grows on the bough "Tilling and building" although its letter is W

  @RSCH-042
  Scenario: The tree holds 174 inventions
    Given the invention tree config
    When the tree is loaded
    Then it holds 174 inventions: 43 of era I, 27 of era II, 18 of era III, 20 of era IV, 19 of era V, 17 of era VI, 18 of era VII and 12 of era VIII

  @RSCH-042
  Scenario Outline: Inventions unlock what their row says
    Given the country "<country>" learns "<invention>"
    When its effect applies
    Then <unlock>

    Examples:
      | country  | invention                        | unlock                                                  |
      | France   | B1 Stone castles                 | castles can be built                                    |
      | France   | F1 Three-field rotation          | farmland harvests one step better                       |
      | Ming     | G9 Professional bureaucracy      | officials cost less and each runs 2 provinces           |
      | Portugal | S5 ocean_navigation              | ships cross oceans and 2 colonial governor slots open   |
      | France   | G5 Royal chancery                | the country has one more envoy                          |
      | England  | C16 railways                     | grain and armies move far faster                        |

  @RSCH-043
  Scenario: Event-tree inventions keep their ids
    Given the event tree uses the ids "bastion_fortification", "printing", "steam_power" and "ocean_navigation"
    When the tree is loaded
    Then "B5", "L5", "C13" and "S5" carry those ids
    And the tree has 20 such inventions

  @RSCH-044
  Scenario: A new invention is one config row
    Given the invention tree config
    When a row "Andean terrace farming" is added with id, parent, also_needs, era, unlocks and start_regions
    Then it hangs on its parent's branch without code changes

  @RSCH-045 @open-question
  Scenario Outline: Scope of eras
    # OQ-RSCH-1: which Era VII inventions fit before 31 August 1939; OQ-RSCH-2: Era VIII event-tree ids
    Given the date is 1938
    When the country "Germany" tries to study "<invention>"
    Then the study is <result>

    Examples:
      | invention                         | result                        |
      | C19 electrification               | allowed if its needs are known |
      | L25 computing                     | refused: Era VIII is out of scope |
      | T17 Container shipping            | refused: Era VIII is out of scope |
      | W21 Tanks                         | allowed only if Era VII inventions before 1939 are kept |
