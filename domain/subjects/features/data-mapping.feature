@context-subjects
Feature: Mapping the data onto the six types
  As the game
  I want the relations data and the event tree mapped onto the six types
  So that every subject in 1444 and every subject made by an event has one type

  @SUBJ-014
  Scenario Outline: Relations types
    Given the 1444 data holds "<subject>" as a subject of "<overlord>" with kind "<data_kind>"
    When the scenario starts
    Then "<subject>" is <result>

    Examples:
      | subject       | overlord     | data_kind           | result                                   |
      | Brittany      | France       | vassal              | a Vassal                                 |
      | Naples        | Papal States | fief                | a Vassal with "Held of the Church"       |
      | Andorra       | Foix         | fief                | a Vassal with "Held in fief"             |
      | Dauphiné      | France       | appanage            | a Vassal with "Kin"                      |
      | Serbia        | Ottomans     | tributary           | a Tributary                              |
      | Sweden        | Denmark      | personal_union      | a Union                                  |
      | Jianzhou      | Ming         | frontier_commandery | a March                                  |
      | Chios         | Genoa        | colony              | a Colony                                 |
      | Croatia       | Hungary      | estate              | a lord of "Hungary", not a country       |

  @SUBJ-015
  Scenario Outline: Event types
    Given the subject rules are in force
    When an event makes "S" a subject of "O" with the type "<type>"
    Then "S" is <result>

    Examples:
      | type          | result                          |
      | vassal        | a Vassal                        |
      | tributary     | a Tributary                     |
      | colony        | a Colony                        |
      | protectorate  | a Protectorate                  |
      | puppet        | a Protectorate                  |
      | dominion      | a Colony at "Self-governing"    |

  @SUBJ-016
  Scenario: Subjects in 1444
    Given the 1444 data holds 167 Subject records of which 32 are estates
    When the scenario starts with every subject a map nation
    Then there are 135 subjects
    And they are 83 vassals, 31 tributaries, 9 unions, 7 marches and 5 colonies

  @SUBJ-106
  Scenario: Balance lives in config
    Given the config value "kinds.vassal.pays_share" is changed
    When the game loads
    Then the 1444 data and the rules are unchanged
