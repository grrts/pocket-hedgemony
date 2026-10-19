@context-province
Feature: Births, deaths and famine
  As the game
  I want people to grow by births, shrink by deaths and die when food runs out
  So that food is the limit on growth

  @PROV-100 @placeholder
  Scenario Outline: Base yearly birth and death rates by class
    # config: province.births, province.deaths
    Given a class "<class>" with no modifiers
    When the game works out the province's stats
    Then its yearly birth rate is <births> and its death rate is <deaths>

    Examples:
      | class        | births | deaths |
      | farmers      | 3.6 %  | 3.0 %  |
      | herders      | 3.6 %  | 3.0 %  |
      | woodsmen     | 3.6 %  | 3.0 %  |
      | seafolk      | 3.6 %  | 3.0 %  |
      | miners       | 3.5 %  | 4.0 %  |
      | craftsmen    | 3.0 %  | 3.5 %  |
      | market folk  | 3.0 %  | 3.5 %  |
      | clerks       | 3.0 %  | 3.5 %  |
      | scholars     | 1.0 %  | 3.0 %  |
      | homeless     | 4.0 %  | 5.0 %  |

  @PROV-100 @PROV-297 @placeholder
  Scenario: Troyes grows by 432 a year with no modifiers
    Given the province "Troyes" has 72,000 farmers and no birth or death modifiers
    When a year of monthly births and deaths passes
    Then 2,592 are born and 2,160 die
    And the province "Troyes" grows by 432 people

  @PROV-101 @PROV-297 @placeholder
  Scenario Outline: Birth modifiers are percentage points
    # Births do not follow food (Leroy, 19 Oct; D-PROV-36)
    Given the province "Troyes" <condition>
    When the game works out the province's stats
    Then the yearly birth rate of its farmers is <rate>

    Examples:
      | condition                                   | rate  |
      | has had 10 years of peace                   | 4.1 % |
      | has war in the province                     | 2.6 % |
      | has plague                                  | 2.6 % |

  @PROV-102 @placeholder
  Scenario Outline: Death modifiers
    Given the province "Troyes" <condition>
    When the game works out the province's stats
    Then the death rate of <who> changes by <change>

    Examples:
      | condition                               | who                      | change |
      | has a plague rumour                     | everyone                 | +5 %   |
      | has a plague outbreak                   | everyone                 | +15 %  |
      | has plague at its worst                 | everyone                 | +30 %  |
      | has war in the province                 | everyone                 | +1 %   |
      | has 2 burned tiles                      | everyone                 | +1 %   |
      | has smoke                               | town classes             | +1 %   |
      | has hospitals, wells and drains         | town classes             | −0.5 % |
      | is in a country that knows sanitation   | everyone                 | −0.5 % |
      | is in a country that knows vaccination  | everyone                 | −0.5 % |

  @PROV-102
  Scenario: Fever land kills people born elsewhere
    Given the province "Guinea" has "deadly" fever land
    When settlers born in "Portugal" live there for a month
    Then the settlers die faster than the locals

  @PROV-103 @placeholder
  Scenario Outline: Clergy births depend on the faith
    Given the clergy of the province follow a faith whose clergy <marry>
    When the game works out the province's stats
    Then the clergy birth rate is <births>

    Examples:
      | marry          | births                |
      | do not marry   | 0.5 %                 |
      | marry          | the townsfolk rate    |

  @PROV-104 @PROV-105
  Scenario: Enough food fills the store
    Given the province "Troyes" has 72,000 people
    And its food this season covers 80,000 people
    When the season's food is compared with the eaters
    Then everyone eats
    And the rest goes to the local store

  @PROV-106 @placeholder
  Scenario: Famine kills the people the food cannot feed, and some flee
    # config: province.famine.flee_share
    Given the province "Troyes" has 72,000 people and food for 64,000 this season
    And the neighbouring province "Sens" has food to spare
    When the season's food is compared with the eaters
    Then 8,000 people cannot be fed
    And 2,000 of them flee to "Sens" as refugees
    And 6,000 die, spread over the classes by their size

  @PROV-106
  Scenario: With no fed neighbour nobody flees
    Given the province "Troyes" has 72,000 people and food for 64,000 this season
    And no neighbouring province has food
    When the season's food is compared with the eaters
    Then 8,000 people die
