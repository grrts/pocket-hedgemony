@context-rebellions
Feature: Cause, demand and leader of a rising
  As the game
  I want each rising to take its cause from the province's heaviest grievance and a named leader from the province
  So that who joins, what they ask and how it can end follow from what went wrong

  @REBL-013 @REBL-014 @REBL-015
  Scenario Outline: The heaviest grievance sets cause, demand and who joins most
    Given the province "Troyes" has the heaviest grievance "<grievance>"
    When a rising starts in the province "Troyes"
    Then the rising has the cause "<cause>"
    And the rising demands "<demand>"
    And most joiners are "<joiners>"

    Examples:
      | grievance          | cause    | demand                                              | joiners                                  |
      | Hungry             | Hunger   | the castle granary opened to them                   | farmers, homeless                        |
      | Heavy taxes        | Tax      | the tax rate back down; the levy ended              | farmers, craftsmen, market folk          |
      | Conscription       | Tax      | the tax rate back down; the levy ended              | farmers, craftsmen, market folk          |
      | Wrong faith        | Faith    | a faith tolerance charter, or a ruler of their faith | everyone of that faith                   |
      | Foreign rule       | Homeland | self-rule, then independence                        | everyone of the homeland's tongue        |
      | Far from the throne| Homeland | self-rule, then independence                        | everyone of the homeland's tongue        |
      | Homeless           | Town     | a town law charter; work; the soldiers gone         | homeless, craftsmen, market folk         |
      | Broken charter     | Town     | a town law charter; work; the soldiers gone         | homeless, craftsmen, market folk         |
      | Soldiers quartered | Town     | a town law charter; work; the soldiers gone         | homeless, craftsmen, market folk         |
      | Harsh lord         | Lord     | the lord's want                                     | the lord's retinue and officials, and his people of his faith and tongue |

  @REBL-013 @REBL-014 @REBL-015
  Scenario: A pretender with a right to the province gives a pretender's war
    Given the province "Troyes" has 1 grievance
    And a pretender has a right to the province "Troyes"
    When a rising starts in the province "Troyes"
    Then the rising has the cause "Pretender"
    And the rising demands "the pretender on the throne, or the province handed to them"
    And most joiners are "lords who back the pretender, and anyone with a grievance"

  @REBL-013 @placeholder
  Scenario Outline: New ideas from the age of revolutions
    # config: new_ideas.min_support (provisional)
    Given the age of revolutions <age>
    And the province "Paris" has 1 grievance
    And the event tree's support for "liberalism" is <support> in the province "Paris"
    When a rising starts in the province "Paris"
    Then the rising <has> the cause "New ideas"

    Examples:
      | age           | support | has           |
      | has begun     | 0.3     | has           |
      | has begun     | 0.29    | does not have |
      | has not begun | 0.6     | does not have |

  @REBL-013
  Scenario: A New ideas rising wants a new government
    Given the age of revolutions has begun
    And the province "Paris" has 1 grievance
    And the event tree's support for "socialism" is 0.4 in the province "Paris"
    When a rising starts in the province "Paris"
    Then the rising demands "a new kind of government"
    And most joiners are "townsfolk and scholars"

  @REBL-016
  Scenario: Settlers taking local people's tiles start a resistance
    Given the province "Hispaniola" is a colony of the country "Castile"
    And local people work tiles in the province "Hispaniola"
    When settlers of "Castile" take a tile of the local people in "Hispaniola"
    Then a resistance of the local people starts in the province "Hispaniola"
    And the resistance has its own named leader
    And the resistance demands its tiles back
    And the resistance can win

  @REBL-017 @REBL-020
  Scenario Outline: Leader drawn by cause
    Given a rising with the cause "<cause>" starts in the province "Troyes"
    When its leader is chosen
    Then the leader is <leader>
    And the leader brings "<brings>"
    And the leader has Might, Cunning and Logistics like a commander

    Examples:
      | cause     | leader                                 | brings                                  |
      | Hunger    | a local such as a miller               | Cunning, little Might                   |
      | Tax       | a local such as a dyer                 | Cunning, little Might                   |
      | Town      | a local such as a village elder        | Cunning, little Might                   |
      | Faith     | a preacher                             | faith spreads to neighbours twice as fast |
      | Lord      | the lord himself                       | his retinue, his wealth and his officials |
      | Pretender | the pretender                          | the lords who back them; foreign help    |

  @REBL-017
  Scenario: Returned soldiers among the homeless give a veteran leader
    Given the province "Troyes" has returned soldiers among its homeless
    When a rising starts in the province "Troyes"
    Then the leader may be a veteran who brings Might

  @REBL-018
  Scenario: A preacher spreads the faith twice as fast
    Given a faith rising led by a preacher holds the province "Prague"
    When the month is processed
    Then the rising's faith spreads to the neighbours of "Prague" twice as fast as without the preacher
