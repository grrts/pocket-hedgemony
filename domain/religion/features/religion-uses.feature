@context-religion
Feature: How other systems use religion
  As the game
  I want religion to hand its facts to risings, war, schools, diplomacy and the country card
  So that faith matters everywhere without each system inventing its own rules

  @RELG-109
  Scenario Outline: Faith risings' demands
    Given a protestant faith rising holds "La Rochelle"
    When the ruler talks with the rebels and offers <offer>
    Then the rebels <answer>

    Examples:
      | offer                                    | answer  |
      | protestant Tolerated where they hold     | accept  |
      | a protestant house of worship there      | accept  |

  @RELG-110
  Scenario Outline: More openings for Defend the faith
    Given the country "Brandenburg" is protestant
    When <cause>
    Then "Brandenburg" gains the war aim "Defend the faith"

    Examples:
      | cause                                                                       |
      | its neighbour persecutes protestants in a province bordering Brandenburg    |
      | its preacher is killed in a foreign realm                                   |
      | a protestant holy place is held by another faith                            |

  @RELG-111
  Scenario: Schools have a faith and persecution drives scholars out
    Given the country "France" persecutes protestants
    Then protestant scholars leave "France" for realms that take them
    And every school in "France" has a faith

  @RELG-112
  Scenario: Facts for diplomacy
    Given "Castile" and "Portugal" are both catholic
    Then diplomacy is told they share a faith
    And diplomacy is told whether each allows the other's preachers

  @RELG-113
  Scenario: Faith % on the country card
    Given the country "Ming" has the state faith "confucian_ritual"
    And its people are 10 % confucian_ritual, 50 % mahayana, 30 % daoist and 10 % asian_traditional
    And asian_traditional is not yet layered with confucian_ritual
    Then the Faith % of "Ming" is 90

  @RELG-114
  Scenario: Faith and tongue stay separate
    Given the people of "Bosnia" convert to sunni
    Then their tongue does not change
    And the faith grievances and tongue grievances stay separate

  @RELG-115
  Scenario: No faith meters
    When the player opens the country card
    Then there is no faith meter, piety, fervour or unity score
    And there is no "convert province" button
