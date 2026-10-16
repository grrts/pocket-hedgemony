@context-recruiting
Feature: Who can be called
  As the game
  I want each province to give only a share of its fighting-age men, by class
  So that no province is ever emptied of the people who farm, herd and work the towns

  @RECR-001 @RECR-002 @RECR-003 @placeholder
  # config: fighting-age share, call share per class
  Scenario Outline: Each class gives its call share of its fighting-age men
    Given the province "Troyes" has 4000 people of class "<class>"
    And the fighting-age share is 0.25
    When the men who can be called are counted
    Then class "<class>" gives <men> men who can be called

    Examples:
      | class        | men |
      | homeless     | 240 |
      | herders      | 160 |
      | farmers      | 120 |
      | woodsmen     | 120 |
      | miners       | 80  |
      | seafolk      | 80  |
      | craftsmen    | 80  |
      | market folk  | 60  |
      | clerks       | 40  |
      | clergy       | 0   |
      | scholars     | 0   |

  @RECR-003 @placeholder
  Scenario: Troyes can give one man in eight of its fighting-age men
    Given the province "Troyes" has 72000 people and about 18000 fighting-age men
    When the men who can be called are counted
    Then the province "Troyes" can give at most about 2200 men

  @RECR-004
  Scenario: The ceiling is never passed
    Given the province "Troyes" has a ceiling of 2200 men who can be called
    And the province "Troyes" has 2200 recruits here
    When a year of refill, disbanded men coming home and an invention are applied
    Then the province "Troyes" has at most 2200 recruits here

  @RECR-005
  Scenario: Classes give the same soldier
    Given the province "Troyes" levies 100 farmers and 100 herders
    When the levy gathers
    Then all 200 men are levies of arm "levy foot"

  @RECR-006 @placeholder
  # config: W15 call share multiplier
  Scenario Outline: Mass conscription raises the call shares by half
    Given the country "France" knows invention "W15 Mass conscription"
    When the call share of class "<class>" is read
    Then the call share is <share> percent of its fighting-age men

    Examples:
      | class    | share |
      | homeless | 36    |
      | farmers  | 18    |
      | clerks   | 6     |

  @RECR-007 @open-question
  # OQ-RECR-13: how many students a levy may take is not given
  Scenario: Clergy and scholars can't be levied but students can
    Given the province "Reims" has clergy, scholars and students
    When the men who can be called are counted
    Then clergy and scholars add 0 men
    And students can be called from the same pool
