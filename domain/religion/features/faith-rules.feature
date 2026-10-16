@context-religion
Feature: What each faith does differently
  As the game
  I want at most one rule per faith, each from a real institution and each a number on an existing stat
  So that faiths feel different without fixed modifiers

  @RELG-086 @RELG-096 @placeholder
  Scenario Outline: Monastic land pays double
    # config key: faith_rules.monastic_land
    Given a <faith> monastery with monastic land is taken over
    Then its property pays double gold into the treasury

    Examples:
      | faith    |
      | catholic |
      | orthodox |

  @RELG-087 @placeholder
  Scenario: Protestant print and schools
    # config key: faith_rules.print_and_school_pull
    Given the province "Wittenberg" has 2 presses and 1 school
    When the year's pulls are worked out
    Then "protestant" gets 1.5 pull from them

  @RELG-088
  Scenario: The crown heads the Anglican church
    Given the country "England" has the state faith "anglican"
    And the lord "Bishop of Durham" is a clergy lord
    When "England" changes any faith policy
    Then the lord "Bishop of Durham" does not waver over it

  @RELG-089 @placeholder @open-question
  Scenario Outline: Hussites merge after the Reformation
    # OQ-RELG-14: period end or 1620
    # config key: faith_rules.merges_into_protestant
    Given the Reformation period has ended
    And the province "<province>" has hussite people and <house>
    Then its hussite share merges into "<into>"

    Examples:
      | province | house                    | into       |
      | Prague   | a protestant church      | protestant |
      | Brno     | no protestant house      | catholic   |

  @RELG-089
  Scenario: Hussites are kin of Protestants once the Reformation starts
    Given the event "protestant_reformation" has fired
    Then "hussite" is a kin faith of "protestant"

  @RELG-090
  Scenario Outline: Protected communities under a Muslim ruler
    Given the ruler of "<country>" is "<ruler>"
    And christians are the majority of "<province>", Restricted and served
    Then "<province>" <grievance> the grievance "Wrong faith"

    Examples:
      | country  | ruler    | province  | grievance     |
      | Ottomans | sunni    | Rumelia   | does not have |
      | Castile  | catholic | Valencia  | has           |

  @RELG-091 @RELG-092 @RELG-093 @RELG-094 @placeholder
  Scenario Outline: Institutional rules
    # config keys: faith_rules.temple_town, faith_rules.langar, faith_rules.monastery_school, faith_rules.lama_lords
    Given the province "Testshire" has <building>
    Then <effect>

    Examples:
      | building                                 | effect                                         |
      | a step-3 hindu temple                    | it draws 150 traders a year                    |
      | a sikh gurdwara                          | it shelters 1,000 homeless like an almshouse   |
      | a theravada house of worship             | it gives 20 student seats                      |
      | a step-3 vajrayana house                 | it can be granted as a lord's land, its abbot the lord |

  @RELG-095 @placeholder
  Scenario Outline: The secular state
    # config key: faith_rules.secular_state
    Given the country "France" has the state faith "secular"
    When it sets catholic to <policy>
    Then the change is <result>

    Examples:
      | policy     | result  |
      | Tolerated  | allowed |
      | Restricted | allowed |
      | Persecuted | refused |

  @RELG-095 @placeholder @open-question
  Scenario: Secular grows in factory towns
    # OQ-RELG-15: factories condition missing from config
    Given the date is 1860
    And the town "Lille" has factories, mass schooling and 2 schools
    Then "secular" gets 1 pull in "Lille"
    And "secular" has no houses
