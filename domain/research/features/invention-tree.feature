@context-research
Feature: One invention tree
  As the game
  I want a single tree from one root that grows back into itself across branches
  So that no country can climb far up one side without reaching across

  @RSCH-040 @RSCH-041
  Scenario: One root, four branches, letters are only labels
    Given the invention tree config
    When the tree is loaded
    Then it has one root "Settled life" with the branches R1 "Tilling and building", R2 "Fire and metal", R3 "Counting and records" and R4 "Boats"
    And "W10 Supply magazines" grows on the branch "Tilling and building" although its letter is W

  @RSCH-042
  Scenario: The tree holds 187 inventions
    Given the invention tree config
    When the tree is loaded
    Then it holds 187 inventions: 8 of era A, 5 of era M, 43 of era I, 27 of era II, 18 of era III, 20 of era IV, 19 of era V, 17 of era VI, 18 of era VII and 12 of era VIII

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

  @RSCH-045 @RSCH-062 @RSCH-063
  Scenario Outline: Scope of eras
    Given the date is 1938
    And the country "Germany" knows everything "<invention>" needs
    When it tries to study "<invention>"
    Then the study is <result>

    Examples:
      | invention                         | result                     |
      | C19 electrification               | allowed                    |
      | W21 Tanks                         | allowed                    |
      | L21 Radio                         | allowed                    |
      | L23 Nuclear physics               | refused as out of scope    |
      | L24 Rocketry                      | refused as out of scope    |
      | L25 computing                     | refused as out of scope    |
      | T17 Container shipping            | refused as out of scope    |

  @RSCH-062
  Scenario: Nothing is studied after the campaign ends
    Given the date is 1 September 1939
    And the country "Germany" knows everything "W21 Tanks" needs
    When it tries to study "W21 Tanks"
    Then the study is refused as out of scope

  @RSCH-063
  Scenario: Era VIII rows stay in the tree but are never studied
    Given the invention tree config
    When the tree is loaded
    Then the 3 event-tree inventions of era VIII keep their ids
    And no country may ever study an invention of era VIII

  @RSCH-064
  Scenario: Ironclads grow from steamships
    Given the invention tree config
    When the tree is loaded
    Then "S14 Ironclads" has the parent "S13 Steamships" and needs nothing else
    And a country of 1850 that knows "S13 Steamships" may study "S14 Ironclads" for 250 scholar-years

  @RSCH-065
  Scenario Outline: The T-branch does what trade says
    Given the country "Venice" learns "<invention>"
    When its effect applies
    Then its row reads "<unlock>"

    Examples:
      | invention                         | unlock                                                                                       |
      | T2 Double-entry bookkeeping       | Collections +10 %                                                                            |
      | T6 Merchant fairs and exchanges   | Market step 2 (yearly fair) can be built; every market serves +2 visits a month              |
      | T8 Licensed trading companies     | Trading posts overseas count as cities and can found traders; +1 colonial governor slot      |
      | T9 joint_stock_finance            | Trade ships cost 25 % less to buy; +1 colonial governor slot                                 |
      | T11 Marine insurance              | Half the purse of a lost ship is refunded                                                    |
      | T13 Commodity exchanges           | See every known province's trade value and ratio                                             |
      | S2 Lateen and junk rigging        | Better trade ships: trade ships' hold +0.5                                                   |

  @RSCH-066
  Scenario Outline: Other designs' edits to the tree
    Given the country "France" learns "<invention>"
    When its effect applies
    Then its row reads "<unlock>"

    Examples:
      | invention                  | unlock                                                                     |
      | G8 Resident ambassadors    | Envoys +1; see others' armies; may ask for passage                         |
      | G3 Tax registers           | Royal provinces pay +10 % (only with a chancery)                           |
      | W15 Mass conscription      | +50 % recruits from all provinces                                          |
      | W12 Standing regiments     | Soldiers who stay: no losses from disbanding; troop cap +0.5 % of people   |

  @RSCH-066
  Scenario: Tax registers need a chancery
    Given the country "France" learns "G3 Tax registers"
    When its effect applies
    Then the effect works only while the realm has a "chancery"
