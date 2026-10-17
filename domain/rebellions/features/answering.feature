@context-rebellions
Feature: Answering a rebellion
  As a player
  I want to grant, talk, bribe, wait or attack, and then pardon, punish or massacre
  So that I can choose between giving in and fighting, each with its cost

  Background:
    Given a tax rising holds the province "Troyes"
    And its leader is "Jehan the Dyer"
    And it demands "the tax rate back down"

  @REBL-045
  Scenario: Granting the demand ends the rising at once
    Given the province "Sens" also has the grievance "Heavy taxes"
    When the owner grants the demand
    Then the tax rate of "Troyes" is lowered
    And the rising ends at once
    And the rebels go back to their classes
    And the province "Troyes" no longer has the grievance "Heavy taxes"
    And the province "Sens" becomes more likely to rise and ask for the same

  @REBL-046
  Scenario Outline: Talks give half the demand and work on some causes only
    Given a rising with the cause "<cause>" holds the province "Troyes"
    When the owner talks with the rebels using an envoy and some gold
    Then the talks offer half the demand
    And the talks <work>

    Examples:
      | cause    | work         |
      | Hunger   | usually work |
      | Tax      | usually work |
      | Town     | usually work |
      | Faith    | rarely work  |
      | Homeland | rarely work  |

  @REBL-047
  Scenario: Bribing the leader removes the leader's bonus
    When the owner bribes "Jehan the Dyer" with gold
    Then "Jehan the Dyer" leaves the rising
    And the rising loses the leader's bonus
    And the rising may split or melt away

  @REBL-047
  Scenario: A lord or pretender costs more to bribe, and a faith rising finds a new preacher
    Given a faith rising led by a preacher holds the province "Prague"
    When the owner bribes the preacher
    Then the faith rising finds a new preacher quickly
    And bribing a lord or a pretender would cost more gold than bribing a local

  @REBL-048
  Scenario Outline: Waiting shrinks only rebels without food or arms
    Given the rising in "Troyes" <has>
    When the owner waits a month
    Then the owner loses the tax and output of "Troyes" for that month
    And the rising <result>

    Examples:
      | has                          | result         |
      | has no food and no arms      | shrinks        |
      | holds a castle               | does not shrink|
      | has a lord                   | does not shrink|
      | has foreign gold             | does not shrink|

  @REBL-049 @placeholder
  Scenario: Beating the rebels scatters them
    # config: rebellions.scatter
    Given the rising in "Troyes" has 3000 men
    When the owner's army beats the rebels in battle
    Then 1000 rebels die
    And 1000 rebels flee abroad
    And 1000 rebels go home to "Troyes" as homeless

  @REBL-050 @placeholder
  Scenario Outline: Treatment after a victory
    # config: rebellions.punish_lock_years, rebellions.massacre_lock_years, rebellions.bloodshed_years
    Given the owner's army has beaten the rising in "Troyes"
    When the owner chooses "<treatment>"
    Then <result>

    Examples:
      | treatment            | result                                                                                         |
      | Pardon               | the survivors return to their classes, "Troyes" calms faster and "Jehan the Dyer" may rise again |
      | Punish the leaders   | "Jehan the Dyer" is executed and "Troyes" gets no new tax rising for 10 years                   |
      | Massacre             | "Troyes" gets no rising for 20 years                                                            |

  @REBL-041 @REBL-050 @placeholder
  Scenario: Massacre spreads Bloodshed to every province of the same faith or tongue
    Given the rebels of "Troyes" are Catholic and speak French
    And the provinces "Sens" and "Reims" are Catholic or French-speaking
    And the lord "Count of Armagnac" is French-speaking
    When the owner chooses "Massacre"
    Then the provinces "Sens" and "Reims" get the grievance "Bloodshed" for 20 years
    And the lord "Count of Armagnac" wavers
