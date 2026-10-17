@context-scenario-setup
Feature: The country catalogue as the source of 1444 entities
  As the game
  I want every 1444 political actor researched once with stable ids and no invented numbers
  So that the starting world is grounded in history and built the same way every time

  @SETUP-001
  Scenario: The catalogue describes the reference day and holds no game numbers
    Given the catalogue record "france"
    When it is read
    Then it describes France on 11 November 1444
    And it holds no numeric game statistics

  @SETUP-002
  Scenario Outline: Entities outside the 1440s are excluded as anachronistic
    Given the entity "<entity>" founded in <year>
    When the catalogue is built
    Then it is listed in the inventory as "excluded_anachronistic"

    Examples:
      | entity          | year |
      | Kazakh Khanate  | 1456 |
      | Funj            | 1504 |

  @SETUP-003
  Scenario Outline: Subordinate entities are included when their politics mattered
    Given the entity "<entity>" is <status>
    When the inclusion rules are applied
    Then it is <result>

    Examples:
      | entity                     | status                                         | result                                         |
      | Wallachia                  | under Ottoman pressure with its own politics   | included                                       |
      | Sharifate of Mecca         | under the Mamluks with its own politics        | included                                       |
      | a pure administrative unit | without separate agency                        | excluded as not distinct or merged into another |

  @SETUP-004
  Scenario Outline: Micro-polities are grouped without implying one state
    Given the group record "<record>"
    When it is read
    Then its text says what it stands for and that it is a grouping

    Examples:
      | record     |
      | silesia    |
      | tusi_group |

  @SETUP-005
  Scenario: Decentralised societies are never forced into nation-states
    Given a stateless society in the catalogue
    When its representation is read
    Then it is "decentralized_polity" or "non_state_actor"
    And its real political structure is described

  @SETUP-006
  Scenario: Disputed entities keep their dispute
    Given an entity whose existence in 1444 is disputed by scholars
    When it is catalogued
    Then it is "included_disputed" with the dispute described

  @SETUP-007
  Scenario: Ids are stable and never reused
    Given the seed id of a record is renamed
    When the catalogue is rebuilt
    Then the old id is kept in the inventory aliases
    And no other record takes the old id

  @SETUP-008
  Scenario Outline: Relationship edges are stored once by their kind
    Given a "<kind>" edge between "<a>" and "<b>"
    When it is stored
    Then it is stored in the region of "<stored with>"

    Examples:
      | kind      | a        | b         | stored with |
      | tributary | ottoman  | wallachia | wallachia   |
      | alliance  | venice   | florence  | venice      |

  @SETUP-009 @SETUP-010
  Scenario Outline: Assessments are levels judged on the right scale
    Given the assessment "<dimension>" of the record "<record>" is "<level>"
    When it is read
    Then it is judged <scale>
    And it carries a justification and a confidence

    Examples:
      | dimension          | record | level     | scale                                    |
      | economic_strength  | france | very_high | on one global scale                      |
      | administrative_capacity | venice | very_high | relative to the entity's own size and type |
      | unrest_risk        | venice | low       | as a risk, where higher is worse         |

  @SETUP-009
  Scenario: There is no overall power score
    Given any catalogue record
    When its assessments are read
    Then no single power score is given

  @SETUP-011
  Scenario Outline: The catalogue holds 963 records by representation
    Given the current catalogue build
    When its records are counted by representation
    Then there are <count> records of "<mode>"

    Examples:
      | mode                   | count |
      | playable_country       | 274   |
      | playable_subject       | 218   |
      | decentralized_polity   | 214   |
      | background_only        | 115   |
      | non_state_actor        | 68    |
      | internal_estate        | 58    |
      | collective_institution | 16    |

  @SETUP-012
  Scenario: AI personalities are tendencies, not scripts
    Given the record "venice"
    When its AI personality is read
    Then it lists priorities, expansion modes, diplomatic style, economic focus, doctrine, risk tolerance, constraints, opportunities, failure conditions and an adaptation note
    And it gives no scripted moves

  @SETUP-013
  Scenario: Nothing comes from commercial games
    Given any catalogue record
    When its meta is read
    Then its "eu4_tag" is null
