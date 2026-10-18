@context-province
Feature: Grievances and rebels
  As the game
  I want anger to be a list of named, fixable grievances
  So that the player can point at every cause of riots and rebels

  @PROV-230 @placeholder
  Scenario Outline: Grievances start and end
    Given the province "Troyes" <start>
    Then the province "Troyes" has the "<grievance>" grievance
    When <end>
    Then the "<grievance>" grievance is gone

    Examples:
      | start                                                       | grievance           | end                                              |
      | has its tax rate at "heavy"                                 | Heavy taxes         | the rate drops to "normal"                       |
      | has a local food store under 1 month                        | Hungry              | the store stays above 3 months for a full season |
      | has more than a tenth of its people homeless                | Homeless            | new buildings take them in                       |
      | has an army staying more than a season                      | Soldiers quartered  | the army leaves                                  |
      | has a burned tile                                           | Burned homes        | all tiles are rebuilt                            |
      | has recruits below a quarter of the pool                    | Conscription        | recruits refill to half                          |
      | is a homeland held by a ruler of another language           | Foreign rule        | a lord of the local language is granted it       |
      | has most people not sharing the ruler's faith               | Wrong faith         | a faith tolerance charter is granted             |
      | is royal with no official                                   | Ungoverned          | an official is assigned                          |
      | has a lord who is Cruel                                     | Harsh lord          | the lord changes                                 |
      | had a charter revoked                                       | Broken charter      | 20 years pass                                    |
      | is 35 days from the capital                                 | Far from the throne | a seat is built nearby                           |
      | has a plague outbreak                                       | Plague              | the plague burns out                             |
      | saw a rising of its faith massacred                         | Bloodshed           | 20 years pass                                    |
      | has food taken from its store by an army                    | Requisitioned       | a season passes after the last taking            |
      | borders a province whose rebels share one of its grievances | Neighbour in revolt | those rebels are beaten                          |

  @PROV-230
  Scenario Outline: Harsh lord
    Given the province "Dijon" is held by a lord who is <trait>
    When the game works out the province's stats
    Then the province "Dijon" has the "Harsh lord" grievance

    Examples:
      | trait                            |
      | Cruel                            |
      | Greedy                           |
      | hostile to the people's faith    |
      | hostile to the people's language |

  @PROV-231 @placeholder
  Scenario Outline: The number of grievances sets the province's mood
    # config: province.grievances.levels
    Given the province "Troyes" has <count> grievances
    When the game works out the province's stats
    Then the province "Troyes" is <state>

    Examples:
      | count | state      |
      | 0     | calm       |
      | 1     | calm       |
      | 2     | grumbling  |
      | 3     | rioting    |
      | 4     | plotting   |
      | 6     | plotting   |

  @PROV-231
  Scenario: Grumbling slows growth and drives out scholars and craftsmen
    Given the province "Troyes" has 2 grievances
    When the game works out the province's stats
    Then its growth slows
    And scholars and craftsmen start to leave

  @PROV-231
  Scenario: Riots halve tax and recruits, drive traders away and make the lord waver
    Given the province "Dijon" is held by the lord "Philip of Burgundy", who is "Loyal"
    When the province "Dijon" gets its third grievance
    Then tax and recruits of "Dijon" are halved
    And traders avoid "Dijon"
    And the lord "Philip of Burgundy" wavers

  @PROV-232
  Scenario Outline: A plotting province rises with a monthly chance
    Given the province "Troyes" has <count> grievances
    When the game works out the province's stats
    Then its monthly chance to rise is <chance>

    Examples:
      | count | chance |
      | 3     | 0 %    |
      | 4     | 5 %    |
      | 5     | 15 %   |
      | 6     | 30 %   |
      | 8     | 30 %   |

  @PROV-232
  Scenario: Rebels rise from the recruit pool under a named leader with a demand
    Given the province "Troyes" has 4 grievances, of which "Heavy taxes" is the biggest
    And the province "Troyes" has 900 recruits here
    When it rises with 1,500 men wanted
    Then 900 of its recruits take up arms
    And they follow a named leader
    And they demand the tax rate back down

  @PROV-232
  Scenario: A spark can start a rising at 3 grievances
    Given the province "Troyes" has 3 grievances
    Then a spark can start a rising there

  @PROV-233
  Scenario Outline: Rebels come from more than grievances
    Given the province "Brittany" has fewer than 4 grievances
    When <cause>
    Then the province "Brittany" has rebels

    Examples:
      | cause                                        |
      | a disloyal lord raises his retinue           |
      | a pretender lands                            |
      | foreign gold arms the people                 |

  @PROV-233
  Scenario Outline: Rebels melt away
    Given the province "Troyes" has rebels
    When <action>
    Then the province "Troyes" has no rebels

    Examples:
      | action                                    |
      | the rebels are beaten                     |
      | their demand is granted                   |
      | the grievances are fixed                  |
      | their leader is killed                    |
      | their leader is bribed                    |

  @PROV-234
  Scenario: Rebel armies fight as a rebel band
    Given the province "Troyes" has rebels in arms
    When they fight a battle
    Then they fight as the "Rebel band" kind under the warfare battle rules

  @PROV-235
  Scenario: Riots and rebels count as in revolt
    Given the country "France" has the province "Troyes" with riots and "Sens" with rebels
    When the game works out the province's stats
    Then the country "France" has 2 provinces in revolt

  @PROV-236
  Scenario: A judge raises the bar for riots
    Given the province "Troyes" has a "judge" official at full effect
    When the province "Troyes" has 3 grievances
    Then it is grumbling, not rioting
    When it has 4 grievances
    Then it is rioting and plotting
    And "Broken charter" fades twice as fast there
