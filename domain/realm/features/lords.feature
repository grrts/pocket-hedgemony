@context-realm
Feature: Named lords
  As a player
  I want my great vassals to be named characters with land, men, gold, wants and loyalty
  So that holding a large realm means managing people

  @REALM-070
  Scenario: The lord card
    Given the lord "Philip of Burgundy" of House Valois-Burgundy, age 48, holds 6 provinces
    And he has a retinue of 4,000 men, 220 gold, the traits Ambitious and Rich, and wants the county of Champagne
    When the player opens his card
    Then it shows his lands, retinue, wealth, traits, want, loyalty "Wavering" and heir

  @REALM-071
  Scenario Outline: The same card, a different label
    Given a country is a <society>
    When the player opens the card of one of its lords
    Then the lord is labelled as <label>

    Examples:
      | society                          | label                     |
      | feudal kingdom                   | a noble                   |
      | city republic                    | a merchant house          |
      | theocracy                        | a bishop or abbot         |
      | steppe realm                     | a clan chief              |
      | chiefdom or stateless society    | an elder or lineage head  |

  @REALM-072 @placeholder
  Scenario: Lords versus officials
    Given the royal province "Troyes" is run by an official
    And the province "Dijon" is held by the lord "Philip of Burgundy"
    When the year's taxes and recruits are collected
    Then "Troyes" sends all its taxes and recruits to the ruler, and the official costs wages
    And "Dijon" sends half its taxes, and its recruits form the lord's retinue, and the lord costs nothing
    And the official can be dismissed at will
    But the lord can be removed only by force, a trial or his line dying out

  @REALM-073
  Scenario Outline: Calling a lord's retinue
    Given the lord "Philip of Burgundy" is "<loyalty>"
    When the country "France" calls his retinue to war
    Then his retinue <result>

    Examples:
      | loyalty  | result        |
      | Loyal    | comes         |
      | Wavering | does not come |
      | Disloyal | does not come |

  @REALM-074
  Scenario Outline: A lord's wealth
    Given the lord "Philip of Burgundy" has 220 gold
    When he <act>
    Then <result>

    Examples:
      | act                         | result                                   |
      | lends to the ruler          | the country "France" owes him gold       |
      | funds a revolt              | a rising is armed with his gold          |

  @REALM-075
  Scenario: Granting a fief makes a new loyal lord
    Given the country "France" holds the royal provinces "Nevers" and "Auxerre", each with an official
    When the country "France" grants both as a fief to its commander "Jean"
    Then "Jean" is a "Loyal" lord holding "Nevers" and "Auxerre"
    And those provinces no longer need a royal official

  @REALM-076
  Scenario: Keeping the local ruler
    Given the country "Castile" has conquered the province "Granada"
    When it keeps the defeated ruler of "Granada" as its lord
    Then he is a "Disloyal" lord holding "Granada"
    And no royal official is needed there
    And the people of "Granada" stay calm

  @REALM-077
  Scenario: Selling a title
    Given the country "France" holds the royal province "Rouen"
    When it sells "Rouen" as a fief to a rich merchant
    Then the country "France" gains gold
    And the merchant is a weak but "Loyal" lord

  @REALM-078
  Scenario: A marriage brings a house in as a lord
    Given a local house holds the province "Béarn" outside the realm of "France"
    When a princess of "France" marries into that house and the house joins
    Then the house is a lord of "France" holding "Béarn"

  @REALM-079 @REALM-113
  Scenario Outline: A lord's land on his death
    Given the lord "Armagnac" holds 4 provinces and has 2 sons
    And the inheritance law of "France" passes a lord's land <law>
    When the lord "Armagnac" dies
    Then <result>

    Examples:
      | law                    | result                                        |
      | to one heir            | his eldest son holds all 4 provinces          |
      | split among the sons   | his lands are split between his 2 sons        |

  @REALM-080 @REALM-086
  Scenario: A neighbour's disloyal lord defects with his land
    Given the lord "Brittany" of the country "Brittany" is "Disloyal" and borders "France"
    When he defects to the country "France"
    Then the country "France" holds his provinces
    And he is a lord of "France"

  @REALM-081 @REALM-166 @placeholder
  Scenario Outline: Starting lords
    # config: starting_lords
    Given the date is 1444
    When the country "<country>" is set up
    Then it starts with <lords>

    Examples:
      | country  | lords                                                      |
      | France   | its great houses from the catalogue, e.g. Armagnac, Bourbon and Orléans |
      | Navarre  | a few generated lords sized to its realm                   |

  @REALM-082
  Scenario: A line dies out
    Given the lord "Armagnac" holds 4 provinces and has no heir
    When the lord "Armagnac" dies
    Then the 4 provinces become royal provinces of "France"
    And each needs an official

  @REALM-083
  Scenario: Seizing a lord's land by decree
    Given the lords "Armagnac" and "Brittany" are "Loyal"
    When the country "France" seizes the land of "Armagnac" by decree
    Then the land of "Armagnac" is royal
    And the lord "Brittany" wavers
    And "Armagnac" may rebel

  @REALM-084
  Scenario: Trial and execution
    Given the lord "Armagnac" of House Armagnac is "Disloyal"
    And another lord of House Armagnac is "Loyal"
    When the country "France" tries and executes the lord "Armagnac"
    Then he is no longer a lord
    And every lord of House Armagnac becomes "Disloyal"

  @REALM-085
  Scenario Outline: Defeating a lord's revolt
    Given the lord "Armagnac" is "In revolt"
    When the country "France" defeats his revolt and <choice>
    Then <result>

    Examples:
      | choice                              | result                                  |
      | keeps the land                      | his land is royal                       |
      | gives it to a loyal claimant        | the claimant is a "Loyal" lord of it    |

  @REALM-087
  Scenario: Two houses merge
    Given the lords "Armagnac" and "Brittany" are separate lords of "France"
    When their houses join by marriage
    Then they are one lord holding both lands

  @REALM-088
  Scenario Outline: Loyalty goes up
    Given the lord "Philip of Burgundy" is "Wavering"
    When <cause>
    Then his loyalty rises

    Examples:
      | cause                                                   |
      | the ruler grants him the county of Champagne he wants   |
      | the ruler gives him a gift of gold                      |
      | the ruler gives him an office at court                  |
      | his house marries into the ruling house                 |
      | he takes part in a victory                              |
      | the reign is long and secure with a clear heir          |
      | the ruler feeds his lands in famine                     |
      | he shares the ruler's faith and tongue                  |

  @REALM-089
  Scenario Outline: Loyalty goes down
    Given the lord "Philip of Burgundy" is "Loyal"
    When <cause>
    Then his loyalty falls

    Examples:
      | cause                                         |
      | his land is taxed heavy or crushing           |
      | the ruler seizes land from him                |
      | the ruler seizes land from another lord       |
      | the realm loses a war                         |
      | the realm loses a battle                      |
      | a child becomes ruler                         |
      | the heir is disputed                          |
      | a new ruler takes the throne                  |
      | the ruler requisitions his grain              |
      | a foreign rival bribes him with promises      |
