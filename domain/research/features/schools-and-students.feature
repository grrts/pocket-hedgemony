@context-research
Feature: Schools, students and scholars
  As a player
  I want schools that turn recruits into students and students into scholars
  So that I can build up research at a visible cost

  @RSCH-001
  Scenario Outline: Schools are gained
    Given the country "France" has no school in the province "Paris"
    When <way>
    Then the province "Paris" has a school

    Examples:
      | way                                              |
      | the country "France" builds one for gold         |
      | a lord founds one                                |
      | the clergy found one                             |
      | the country "France" conquers a town with a school |

  @RSCH-002
  Scenario Outline: Schools are lost
    Given the province "Paris" has a university
    When <cause>
    Then the university of "Paris" <result>

    Examples:
      | cause                                                   | result |
      | its upkeep is not paid                                  | closes |
      | it is sacked in war                                     | is lost |
      | a religious change closes the other faith's schools     | closes |

  @RSCH-003 @placeholder
  Scenario Outline: School types and seats come from the tree
    # config: research.school_seats
    Given the country "France" knows the invention "<invention>"
    When it builds a <school>
    Then the school has <seats> student seats

    Examples:
      | invention                       | school                       | seats |
      | L1 Temple and monastery schools | temple or monastery school   | 20    |
      | L2 Madrasa networks             | madrasa                      | 30    |
      | L7 Universities                 | university                   | 60    |
      | L12 Academies of science        | academy                      | 100   |

  @RSCH-003 @open-question
  Scenario: Mass schooling gives every province seats
    # OQ-RSCH-9: how many seats is not given
    Given the country "Prussia" knows the invention "L18 mass_literacy_schooling"
    When the year begins
    Then every province of "Prussia" has school seats

  @RSCH-004
  Scenario: The player sets how many seats to fill
    Given the country "France" has 200 empty seats and 48,000 recruits
    When the player sets 150 seats to be filled
    Then 150 recruits become students
    And the country "France" has 47,850 recruits

  @RSCH-005
  Scenario Outline: Students are lost
    Given the country "France" has 200 students
    When <cause>
    Then the country "France" has fewer than 200 students

    Examples:
      | cause                                  |
      | some students graduate                 |
      | students are called back into the army |
      | famine strikes a school town           |
      | plague strikes a school town           |

  @RSCH-006 @placeholder
  Scenario Outline: Students graduate after five years
    # config: research.graduation_years
    Given 40 students enrolled in "<province>" <years> years ago
    And the province "<province>" <official>
    When the year ends
    Then the 40 students <result>

    Examples:
      | province | years | official                    | result            |
      | Paris    | 5     | has no Schoolmaster         | graduate          |
      | Paris    | 4     | has no Schoolmaster         | are still students |
      | Orléans  | 4     | has a Schoolmaster official | graduate          |

  @RSCH-007
  Scenario Outline: A graduate may become an official
    Given a student of a <school> graduates
    When the player makes him an official
    Then he may be a <types>

    Examples:
      | school     | types                       |
      | madrasa    | judge or chaplain           |
      | university | judge or steward            |
      | academy    | master of works or warden   |

  @RSCH-007
  Scenario: The examination system makes scholars officials directly
    Given the country "Ming" knows the invention "G4 Examination system"
    When the player needs an official
    Then a scholar can become an official directly

  @RSCH-008
  Scenario Outline: Scholars come and go
    Given the country "Venice" has 35 scholars
    When <cause>
    Then its scholars are <direction>

    Examples:
      | cause                                              | direction |
      | students graduate                                  | more      |
      | it hires a foreign scholar for gold                | more      |
      | scholars flee a war abroad to Venice               | more      |
      | scholars die of old age                            | fewer     |
      | war reaches a school town                          | fewer     |
      | persecution drives scholars abroad                 | fewer     |
      | a richer neighbour poaches scholars                | fewer     |
