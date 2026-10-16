@context-recruiting
Feature: Training levies into regiments
  As a player
  I want to train levies at a castle or drill yard into regiments of one arm
  So that my army gains better soldiers at a known price in months, gold, food and gear

  # config: training room per place
  @RECR-039 @RECR-040 @placeholder
  Scenario Outline: Training room per training place
    Given the province "Troyes" has a <place>
    When the training room of province "Troyes" is read
    Then it trains <room> men at once

    Examples:
      | place              | room |
      | earthwork ring fort | 1000 |
      | stone castle       | 3000 |
      | bastion fort       | 5000 |
      | star fort          | 8000 |
      | drill yard         | 1500 |
      | barracks           | 4000 |

  @RECR-041
  Scenario: A castle and a drill yard add their rooms
    Given the province "Troyes" has a stone castle and a drill yard
    When the training room of province "Troyes" is read
    Then it trains 4500 men at once

  @RECR-042
  Scenario: A town that can't train sends its levies to the nearest place that can
    Given the province "Bar" has no castle and no drill yard
    And the nearest training place is the castle of "Troyes"
    When the player trains levies standing in "Bar"
    Then the levies march to "Troyes" to train

  @RECR-043
  Scenario: Giving a training order
    Given the country "France" has 5000 levies at "Troyes"
    When the player trains 2500 of them into "pikes" at the castle of "Troyes"
    Then 2500 levies walk to the castle of "Troyes" and start training
    And the other 2500 stay levies

  @RECR-044
  Scenario: Only unlocked arms can be trained
    Given the country "France" has not unlocked "musketeers"
    When the player tries to train levies into "musketeers"
    Then the order is refused

  # config: months, gold and needs per arm
  @RECR-045 @placeholder
  Scenario Outline: What each regiment type takes per 1000 men
    When 1000 levies start training into "<arm>"
    Then the training takes <months> months and <gold> gold
    And it takes "<needs>" from the stores

    Examples:
      | arm                 | months | gold | needs                                           |
      | levy foot           | 0      | 0    | nothing                                         |
      | armoured foot       | 2      | 80   | 10 loads of arms                                |
      | pikes               | 3      | 60   | 10 loads of arms                                |
      | archers             | 4      | 60   | 10 loads of arms                                |
      | hand gunners        | 3      | 120  | 10 loads of arms, 10 powder                     |
      | pike and shot       | 4      | 150  | 20 arms, 10 powder                              |
      | musketeers          | 5      | 180  | 20 arms, 20 powder                              |
      | line infantry       | 6      | 220  | 20 arms, 20 powder                              |
      | riflemen            | 6      | 300  | 30 arms, 30 powder                              |
      | light horse         | 3      | 100  | 1000 horses                                     |
      | camel riders        | 3      | 100  | 1000 camels                                     |
      | horse archers       | 6      | 150  | 1000 horses, 10 arms                            |
      | knights and lancers | 9      | 300  | 1500 horses, 20 arms                            |
      | war elephants       | 6      | 400  | 125 elephants                                   |
      | gun crews           | 4      | 200  | the guns, horses or oxen for them, 20 powder    |

  @RECR-046 @RECR-076 @placeholder
  Scenario: A Marshal makes training faster and better
    Given the official of province "Troyes" is a Marshal
    When 1000 levies train into "archers" at "Troyes"
    Then the training is 25 percent faster
    And the regiment leaves with drill 4

  @RECR-047
  Scenario: Veterans train in half the time
    Given 1000 levies who are all veterans
    When they train into "pikes"
    Then the training takes 1.5 months

  @RECR-048
  Scenario: Retraining to a newer arm
    Given a regiment of 1000 "pikes" with drill 5 and scars
    When it retrains into "pike and shot"
    Then the retraining takes 2 months and 75 gold
    And the regiment keeps drill 5 and its scars

  @RECR-049
  Scenario: Levies called out of training
    Given 2500 levies have trained 2 months of 3 into "pikes"
    When they are called out of training to fight
    Then they go as "levy foot"
    And the 2 months spent are lost

  @RECR-050
  Scenario: A siege stops training
    Given 2500 levies train at the castle of "Langres"
    When the castle of "Langres" is put under siege
    Then all training at "Langres" stops

  @RECR-051 @RECR-052 @placeholder
  Scenario Outline: What a regiment is when it finishes
    Given a company that is <state>
    Then its drill is <drill>
    And its break point is <break>

    Examples:
      | state                             | drill | break                    |
      | untrained levies                  | 0     | 25 percent               |
      | a trained regiment                | 3     | 30 percent plus troop level |
      | a regiment trained under a Marshal | 4    | 30 percent plus troop level |

  @RECR-051 @placeholder @open-question
  # OQ-RECR-9: which arms fall into which pay group
  Scenario Outline: Pay by arm after training
    Given a trained regiment of <men> "<group>"
    When the month is paid after its free months
    Then the regiment costs <gold> gold

    Examples:
      | group     | men  | gold |
      | foot      | 1000 | 200  |
      | gunners   | 1000 | 250  |
      | horse     | 1000 | 400  |
      | knights   | 1000 | 600  |
      | gun crews | 150  | 10   |

  @RECR-051
  Scenario: Training doesn't change the kind
    Given 1000 levies of kind "levy"
    When they finish training into "pikes"
    Then the regiment is still of kind "levy"

  @RECR-053 @placeholder
  Scenario: Trained levies go home like levies
    Given a trained regiment of kind "levy" that has been out 7 months unpaid double
    When the month ends
    Then 5 percent of its men go home

  @RECR-054
  Scenario Outline: Pay owed when training runs past the free months
    When 1000 levies train into "<arm>"
    Then <pay_months> months of pay are owed before they fight

    Examples:
      | arm                 | pay_months |
      | pikes               | 0          |
      | light horse         | 0          |
      | knights and lancers | 6          |
