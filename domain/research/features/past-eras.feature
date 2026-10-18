@context-research
Feature: The tree reaches back before 1444
  As the game
  I want the one tree to start before 1444 with inventions some realms still lack
  So that some countries start on the back foot and must catch up

  @RSCH-091 @RSCH-092
  Scenario: Two eras before 1444
    Given the invention tree config with the past eras
    When the tree is loaded
    Then it has the eras Ancient and Medieval before era I
    And it holds 8 past inventions of era Ancient and 5 of era Medieval
    And it holds 187 inventions in all

  @RSCH-093
  Scenario Outline: Past inventions open the Era I rows
    Given the invention tree config with the past eras
    When the tree is loaded
    Then "<invention>" needs the past invention "<past>"

    Examples:
      | invention                  | past                    |
      | B1 Stone castles           | B02 Dressed stone       |
      | F1 Three-field rotation    | F02 Heavy plough        |
      | C2 Blast furnace           | C01 Iron smelting       |
      | W2 Heavy armoured cavalry  | F03 Riding and pack animals |
      | W3 Bombards                | C03 Gunpowder           |
      | G1 Written law codes       | G01 Writing             |
      | T2 Double-entry bookkeeping | L01 Positional numbers |
      | S4 Carrack and caravel     | S02 Sternpost rudder    |

  @RSCH-093
  Scenario: Schools without writing through knot records
    Given the country "Inca" starts without "G01 Writing" but with "G6 Quipu and knot records"
    When it tries to study "L1 Temple and monastery schools"
    Then the study is allowed

  @RSCH-095 @placeholder
  Scenario Outline: A past invention is cheap and spreads
    # config: research.era_cost
    Given the country "<country>" starts without "<past>"
    And <n> neighbours or trade partners of "<country>" know "<past>"
    When it tries to study "<past>" in 1450
    Then the past invention costs <cost> scholar-years

    Examples:
      | country | past                | n | cost |
      | Aztecs  | C01 Iron smelting   | 0 | 10   |
      | Kongo   | G01 Writing         | 0 | 10   |
      | Songhai | C03 Gunpowder       | 3 | 10.5 |

  @RSCH-094 @placeholder
  Scenario Outline: Without a past invention a realm plays below the baseline
    # config: research.without
    Given the country "<country>" starts without "<past>"
    When its lack of a past invention applies
    Then <cost>

    Examples:
      | country  | past                        | cost                                       |
      | Iroquois | F01 Ox plough               | its farmland harvests one step worse       |
      | Aztecs   | F03 Riding and pack animals | it can raise no horse regiments            |
      | Kongo    | B01 Wheel and carts         | its armies carry half the food             |
      | Inca     | C01 Iron smelting           | its regiments fight 20 % weaker            |

  @RSCH-094
  Scenario: Knowing every past invention changes nothing
    Given the country "France" starts knowing every past invention
    When its lack of a past invention applies
    Then nothing changes against today's rules

  @RSCH-096
  Scenario: Horses reach the Americas only by contact
    Given the country "Aztecs" starts without "F03 Riding and pack animals"
    And no realm from across the ocean has met it
    When it tries to study "F03 Riding and pack animals"
    Then the study is refused until first contact
    When exploration reports its first contact with "Castile"
    Then the country "Aztecs" may study "F03 Riding and pack animals"

  @RSCH-097 @placeholder
  Scenario Outline: Standing
    # config: research.standing_share
    Given the date is 11 November 1444
    When the country "<country>" is set up from its start group
    Then its standing is "<standing>"
    And it is behind the times by <eras> eras

    Examples:
      | country  | standing | eras |
      | France   | Era I    | 0    |
      | Ming     | Era I    | 0    |
      | Champa   | Medieval | 1    |
      | Oirat    | Ancient  | 2    |
      | Mali     | Ancient  | 2    |
      | Iroquois | Ancient  | 2    |
